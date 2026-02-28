from fastapi import APIRouter, HTTPException
from schemas.compile import CompileRequest, CompileResponse, VisualizeRequest, VisualizeResponse
from services.java_compiler import compile_java
from services.codeReview import explain_error, ai_review_error
from services.visualizer import visualize_code
from core.config import settings

router = APIRouter(prefix="/api", tags=["compile"])

@router.post("/compile", response_model=CompileResponse)
async def compile_endpoint(request: CompileRequest):
    source_code = request.code
    stdin_input = request.stdin or ""

    if not source_code:
        raise HTTPException(status_code=400, detail="No code provided")

    print(f"[COMPILE REQUEST] Code length: {len(source_code)}, Stdin length: {len(stdin_input)}")
    
    # Run sync function in thread pool
    try:
        result = compile_java(source_code, stdin_input)

        error_text = result.get('error', '')
        if error_text and error_text.strip():
            is_compilation = not result.get('success') and (
                'Compilation failed' in error_text or 'error:' in error_text
            )

            ai_explanation = ai_review_error(
                error_text=error_text,
                source_code=source_code,
                is_compilation_error=is_compilation,
            )
            if ai_explanation:
                result['ai_review'] = ai_explanation
            else:
                review = explain_error(
                    error_text=error_text,
                    source_code=source_code,
                    is_compilation_error=is_compilation,
                )
                if review:
                    result['error_review'] = review

        return CompileResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/visualize", response_model=VisualizeResponse)
async def visualize_endpoint(request: VisualizeRequest):
    code = request.code
    if not code:
        raise HTTPException(status_code=400, detail="No code provided")

    try:
        result = visualize_code(code)
        return VisualizeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
