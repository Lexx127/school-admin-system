from database import engine
from models import Base

print("Creating/migrating all tables...")
Base.metadata.create_all(bind=engine)
print("Done!")
