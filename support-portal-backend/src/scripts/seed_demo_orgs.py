from src.core.database import SessionLocal
from src.models import Organization


def seed_organizations():
    session = SessionLocal()
    try:
        orgs = [
            Organization(name="NovaCart", industry="E-Commerce", domain="novacart.demo"),
            Organization(name="HealthPlus", industry="Healthcare", domain="healthplus.demo"),
            Organization(name="EduSphere", industry="Education", domain="edusphere.demo"),
            Organization(name="CodeForge", industry="Developer SaaS", domain="codeforge.demo"),
        ]

        # Check if they already exist to be safe
        existing = session.query(Organization.name).all()
        existing_names = [e[0] for e in existing]

        added = 0
        for org in orgs:
            if org.name not in existing_names:
                session.add(org)
                added += 1

        session.commit()
        print(f"Successfully seeded {added} Demo Organizations.")
    except Exception as e:
        session.rollback()
        print(f"Error seeding organizations: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    seed_organizations()
