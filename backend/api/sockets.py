import os
import shutil
import tempfile
import subprocess
import threading
from pathlib import Path
from flask import request
from flask_socketio import emit
from utils.helpers import _ansi_escape
from services.codeReview import ai_review_error, explain_error

# Maps socket session ID → running subprocess
interactive_processes: dict[str, subprocess.Popen] = {}
# Maps socket session ID → temp directory path (for cleanup)
interactive_temp_dirs: dict[str, str] = {}
# Lock for thread-safe process management
process_lock = threading.Lock()


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


def register_socket_events(socketio):
    @socketio.on('connect')
    def handle_connect():
        sid = request.sid
        print(f"[JYVRA SOCKET] Client connected: {sid}")
        emit('connected', {'sid': sid})

    @socketio.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        print(f"[JYVRA SOCKET] Client disconnected: {sid}")
        _kill_process(sid)

    @socketio.on('terminal:run')
    def handle_terminal_run(data):
        sid = request.sid
        _kill_process(sid)

        code = data.get('code', '').strip()
        print(
            f"[JYVRA SOCKET] Received code to run from sid={sid}, length={len(code)}")
        if not code:
            emit('terminal:error', {'message': 'No code provided'})
            return

        try:
            emit('terminal:output', {
                 'data': '\r\n\x1b[36m⚙  Compiling...\x1b[0m\r\n'})

            from services.java_compiler import start_interactive_session
            proc, temp_dir, compile_result = start_interactive_session(code)

            if not proc:
                error_msg = compile_result.stderr or "Compilation failed"
                emit('terminal:output', {
                    'data': f'\r\n\x1b[31m✗ Compilation Error:\x1b[0m\r\n{_ansi_escape(error_msg)}\r\n'
                })

                emit('terminal:output', {
                    'data': '\r\n\x1b[36m🤖 Asking AI for help...\x1b[0m\r\n'
                })
                ai_explanation = ai_review_error(error_msg, code, True)
                if ai_explanation:
                    emit('terminal:output', {
                        'data': f'\r\n\x1b[33m💡 AI Suggestion:\x1b[0m\r\n{_ansi_escape(ai_explanation)}\r\n'
                    })
                else:
                    review = explain_error(error_msg, code, True)
                    if review:
                        explanation = review.get("explanation", "")
                        suggestions = "\n".join(
                            f"• {s}" for s in review.get("suggestions", []))
                        emit('terminal:output', {
                            'data': f'\r\n\x1b[33m💡 Suggestion:\x1b[0m\r\n{_ansi_escape(explanation)}\r\n\r\n{_ansi_escape(suggestions)}\r\n'
                        })

                emit('terminal:exit', {'code': 1,
                     'reason': 'compilation_error'})
                shutil.rmtree(temp_dir, ignore_errors=True)
                return

            emit('terminal:output', {
                 'data': '\x1b[32m✓ Compiled successfully\x1b[0m\r\n\r\n'})

            with process_lock:
                interactive_processes[sid] = proc
                interactive_temp_dirs[sid] = temp_dir

            def _stream_output():
                import os as python_os
                try:
                    # Use raw os.read to bypass any Python-level buffering
                    fd = proc.stdout.fileno()
                    output_buffer = []
                    while True:
                        chunk = python_os.read(fd, 1)
                        if not chunk:
                            break
                        try:
                            text = chunk.decode('utf-8', errors='replace')
                            output_buffer.append(text)
                            socketio.emit('terminal:output', {
                                          'data': text.replace('\n', '\r\n')}, to=sid)
                        except Exception:
                            pass

                    exit_code = proc.wait()

                    if exit_code != 0:
                        full_output = "".join(output_buffer)

                        socketio.emit('terminal:output', {
                            'data': '\r\n\x1b[36m🤖 Asking AI for help...\x1b[0m\r\n'
                        }, to=sid)

                        from services.codeReview import ai_review_error, explain_error
                        ai_explanation = ai_review_error(
                            full_output, code, False)

                        if ai_explanation:
                            socketio.emit('terminal:output', {
                                'data': f'\r\n\x1b[33m💡 AI Suggestion:\x1b[0m\r\n{_ansi_escape(ai_explanation)}\r\n'
                            }, to=sid)
                        else:
                            review = explain_error(full_output, code, False)
                            if review:
                                explanation = review.get("explanation", "")
                                suggestions = "\n".join(
                                    f"• {s}" for s in review.get("suggestions", []))
                                socketio.emit('terminal:output', {
                                    'data': f'\r\n\x1b[33m💡 Suggestion:\x1b[0m\r\n{_ansi_escape(explanation)}\r\n\r\n{_ansi_escape(suggestions)}\r\n'
                                }, to=sid)

                    socketio.emit('terminal:exit', {
                                  'code': exit_code, 'reason': 'natural'}, to=sid)
                except Exception as e:
                    socketio.emit('terminal:exit', {
                                  'code': -1, 'reason': str(e)}, to=sid)
                finally:
                    _kill_process(sid)

            socketio.start_background_task(_stream_output)

        except Exception as e:
            emit('terminal:error', {'message': str(e)})
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass

    @socketio.on('terminal:input')
    def handle_terminal_input(data):
        sid = request.sid
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

    @socketio.on('terminal:kill')
    def handle_terminal_kill():
        sid = request.sid
        _kill_process(sid)
        emit('terminal:exit', {'code': -1, 'reason': 'killed'})

    @socketio.on('terminal:resize')
    def handle_terminal_resize(data):
        pass
