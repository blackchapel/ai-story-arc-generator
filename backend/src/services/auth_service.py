import logging
from sqlalchemy.orm import Session
from src.schemas.user_schema import UserSchema

logger = logging.getLogger(__name__)


def get_or_create_user(firebase_uid: str, email: str, db: Session) -> UserSchema:
    """Get or create a user record by Firebase UID.

    Migration strategy: if a user exists with the same email but a different ID
    (legacy UUID from old OTP auth), return them as-is without changing their ID.
    New users get the Firebase UID as their primary key.
    """
    # 1. Exact match by Firebase UID (primary path for existing Firebase users)
    user = db.query(UserSchema).filter(UserSchema.id == firebase_uid).first()
    if user:
        # Sync email in case it changed in Firebase
        if user.email != email:
            user.email = email
            db.commit()
            db.refresh(user)
        return user

    # 2. Match by email — handles legacy users migrating from OTP auth
    user = db.query(UserSchema).filter(UserSchema.email == email).first()
    if user:
        logger.info(
            "Legacy user %s authenticated via Firebase (uid=%s)",
            email,
            firebase_uid,
        )
        return user

    # 3. Brand-new user
    user = UserSchema(id=firebase_uid, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created new user %s (firebase_uid=%s)", email, firebase_uid)
    return user
