"""Auth API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.services.auth_service import AuthService
from app.schemas.auth import LoginRequest, AuthResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password."""
    service = AuthService(db)
    result = await service.login(data.email, data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return result


@router.post("/demo", response_model=AuthResponse)
async def demo_login(db: AsyncSession = Depends(get_db)):
    """Log in as the seeded demo user (no password required)."""
    service = AuthService(db)
    try:
        return await service.demo_login()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/me", response_model=UserOut)
async def me(current_user=Depends(get_current_user)):
    """Return current authenticated user info."""
    return UserOut.model_validate(current_user)
