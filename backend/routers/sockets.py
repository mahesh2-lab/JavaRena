import os
import shutil
import threading
import subprocess
import socketio
from typing import Dict, Any
from utils.helpers import _ansi_escape
from services.codeReview import ai_review_error, explain_error
from services.java_compiler import start_interactive_session

# Maps socket session ID → running subprocess
interactive_processes: Dict[str, subprocess.Popen] = {}
# Maps socket session ID → temp directory path (for cleanup)
interactive_temp_dirs: Dict[str, str] = {}
# Lock for thread-safe process management
process_lock = threading.Lock()

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

def _kill_process(sid: str):
    """Kill an interactive process and clean up its resources."""
    with process_lock:
        proc = interactive_processes.pop(sid, None)
        temp_dir = interactive_temp_dirs.pop(sid, None)

    if proc:
        try:
            proc.stdin.close()
        except Exception:
            pass
        try:
            proc.kill()
            proc.wait(timeout=5)
        except Exception:
            pass
        print(f"[JYVRA TERMINAL] Killed process for sid={sid}")

    if temp_dir and os.path.exists(temp_dir):
        try:
            shutil.rmtree(temp_dir)
            print(f"[JYVRA TERMINAL] Cleaned temp dir for sid={sid}")
        except Exception as e:
            print(f"[JYVRA TERMINAL] Failed to clean temp dir {temp_dir}: {e}")

@sio.event
async def connect(sid, environ):
    print(f"[JYVRA SOCKET] Client connected: {sid}")
    await sio.emit('connected', {'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"[JYVRA SOCKET] Client disconnected: {sid}")
    _kill_process(sid)

@sio.on('terminal:run')
async def handle_terminal_run(sid, data):
    _kill_process(sid)

    code = data.get('code', '').strip()
    print(f"[JYVRA SOCKET] Received code to run from sid={sid}, length={len(code)}")
    
    if not code:
        await sio.emit('terminal:error', {'message': 'No code provided'}, room=sid)
        return

    try:
        await sio.emit('terminal:output', {
             'data': '\r\n\x1b[36m⚙  Compiling...\x1b[0m\r\n'}, room=sid)

        # start_interactive_session is sync, call in a way that doesn't block (using loop.run_in_executor if needed, but for simplicity we'll keep it as is or wrap it)
        # Actually, for a production FastAPI app, we should use a proper background task or async wrapper
        import asyncio
        loop = asyncio.get_event_loop()
        proc, temp_dir, compile_result = await loop.run_in_executor(None, start_interactive_session, code)

        if not proc:
            error_msg = getattr(compile_result, 'stderr', None) or "Compilation failed"
            await sio.emit('terminal:output', {
                'data': f'\r\n\x1b[31m✗ Compilation Error:\x1b[0m\r\n{_ansi_escape(error_msg)}\r\n'
            }, room=sid)

            await sio.emit('terminal:output', {
                'data': '\r\n\x1b[36m🤖 Asking AI for help...\x1b[0m\r\n'
            }, room=sid)
            
            ai_explanation = await loop.run_in_executor(None, ai_review_error, error_msg, code, True)
            if ai_explanation:
                await sio.emit('terminal:output', {
                    'data': f'\r\n\x1b[33m💡 AI Suggestion:\x1b[0m\r\n{_ansi_escape(ai_explanation)}\r\n'
                }, room=sid)
            else:
                review = await loop.run_in_executor(None, explain_error, error_msg, code, True)
                if review:
                    explanation = review.get("explanation", "")
                    suggestions = "\n".join(f"• {s}" for s in review.get("suggestions", []))
                    await sio.emit('terminal:output', {
                        'data': f'\r\n\x1b[33m💡 Suggestion:\x1b[0m\r\n{_ansi_escape(explanation)}\r\n\r\n{_ansi_escape(suggestions)}\r\n'
                    }, room=sid)

            await sio.emit('terminal:exit', {'code': 1, 'reason': 'compilation_error'}, room=sid)
            shutil.rmtree(temp_dir, ignore_errors=True)
            return

        await sio.emit('terminal:output', {
             'data': '\x1b[32m✓ Compiled successfully\x1b[0m\r\n\r\n'}, room=sid)

        with process_lock:
            interactive_processes[sid] = proc
            interactive_temp_dirs[sid] = temp_dir

        # Start output streaming in a separate thread/task
        asyncio.create_task(_stream_output(sid, proc, code))

    except Exception as e:
        await sio.emit('terminal:error', {'message': str(e)}, room=sid)
        _kill_process(sid)

async def _stream_output(sid, proc, code):
    import os as python_os
    import asyncio
    
    loop = asyncio.get_event_loop()
    
    try:
        fd = proc.stdout.fileno()
        output_buffer = []
        
        while True:
            # We use loop.run_in_executor for the blocking read
            chunk = await loop.run_in_executor(None, python_os.read, fd, 1)
            if not chunk:
                break
            try:
                text = chunk.decode('utf-8', errors='replace')
                output_buffer.append(text)
                await sio.emit('terminal:output', {
                    'data': text.replace('\n', '\r\n')
                }, room=sid)
            except Exception:
                pass

        exit_code = await loop.run_in_executor(None, proc.wait)

        if exit_code != 0:
            full_output = "".join(output_buffer)
            await sio.emit('terminal:output', {
                'data': '\r\n\x1b[36m🤖 Asking AI for help...\x1b[0m\r\n'
            }, room=sid)

            ai_explanation = await loop.run_in_executor(None, ai_review_error, full_output, code, False)
            if ai_explanation:
                await sio.emit('terminal:output', {
                    'data': f'\r\n\x1b[33m💡 AI Suggestion:\x1b[0m\r\n{_ansi_escape(ai_explanation)}\r\n'
                }, room=sid)
            else:
                review = await loop.run_in_executor(None, explain_error, full_output, code, False)
                if review:
                    explanation = review.get("explanation", "")
                    suggestions = "\n".join(f"• {s}" for s in review.get("suggestions", []))
                    await sio.emit('terminal:output', {
                        'data': f'\r\n\x1b[33m💡 Suggestion:\x1b[0m\r\n{_ansi_escape(explanation)}\r\n\r\n{_ansi_escape(suggestions)}\r\n'
                    }, room=sid)

        await sio.emit('terminal:exit', {'code': exit_code, 'reason': 'natural'}, room=sid)
    except Exception as e:
        await sio.emit('terminal:exit', {'code': -1, 'reason': str(e)}, room=sid)
    finally:
        _kill_process(sid)

@sio.on('terminal:input')
async def handle_terminal_input(sid, data):
    with process_lock:
        proc = interactive_processes.get(sid)

    if proc and proc.poll() is None:
        try:
            input_data = data.get('data', '')
            if isinstance(input_data, str):
                input_bytes = input_data.encode('utf-8')
            else:
                input_bytes = input_data

            proc.stdin.write(input_bytes)
            proc.stdin.flush()
        except Exception as e:
            print(f"[JYVRA SOCKET] Stdin error: {e}")

@sio.on('terminal:kill')
async def handle_terminal_kill(sid):
    _kill_process(sid)
    await sio.emit('terminal:exit', {'code': -1, 'reason': 'killed'}, room=sid)

@sio.on('terminal:resize')
async def handle_terminal_resize(sid, data):
    pass
