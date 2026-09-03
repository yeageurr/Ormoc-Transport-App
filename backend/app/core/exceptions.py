from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def register_exception_handlers(app: FastAPI) -> None:

  @app.exception_handler(StarletteHTTPException)
  async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
      status_code=exc.status_code,
      content={"error": {"code": exc.status_code, "message": exc.detail, "details": None}},
    )

  @app.exception_handler(RequestValidationError)
  async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [
      {"field": ".".join(str(loc) for loc in err["loc"] if loc != "body"), "message": err["msg"]}
      for err in exc.errors()
    ]
    return JSONResponse(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      content={"error": {"code": 422, "message": "Validation failed", "details": errors}},
    )

  @app.exception_handler(Exception)
  async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      content={"error": {"code": 500, "message": "An unexpected error occurred", "details": None}},
    )