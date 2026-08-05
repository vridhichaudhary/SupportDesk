import uuid
import random
from datetime import datetime, timedelta
import sys
import os

# Ensure src is in the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.core.database import SessionLocal
from src.models import (
    Organization, Customer, Ticket, TicketStatus, TicketPriority, TicketCategory, 
    User, UserRole, Team, RoutingDecision
)
from src.services.ticket import ticket_service

def generate_demo_data():
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        if not org:
            print("No organization found. Run seed_demo_orgs.py first.")
            return
            
        print(f"Generating demo tickets for organization: {org.name}")
        
        # Ensure we have a customer
        customer = db.query(Customer).filter(Customer.organization_id == org.id).first()
        if not customer:
            customer = Customer(
                organization_id=org.id,
                email="demo.customer@example.com",
                name="Demo Customer"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
            
        # Get agents and teams
        agents = db.query(User).filter(User.organization_id == org.id, User.role == UserRole.AGENT).all()
        teams = db.query(Team).filter(Team.organization_id == org.id).all()
        
        agent_ids = [a.id for a in agents] if agents else [None]
        team_ids = [t.id for t in teams] if teams else [None]
        
        subjects = [
            "Cannot access my account", "Billing issue with latest invoice",
            "How do I reset my password?", "Feature request: Dark mode",
            "Bug: App crashes on startup", "I want to upgrade my plan",
            "Payment failed", "Integration with Slack is not working",
            "Where can I find the API docs?", "Security vulnerability report"
        ]
        
        categories = list(TicketCategory)
        priorities = list(TicketPriority)
        statuses = list(TicketStatus)
        
        now = datetime.utcnow()
        
        # Generate 150 tickets spread over the last 30 days
        print("Creating 150 tickets...")
        tickets = []
        for i in range(150):
            days_ago = random.randint(0, 30)
            created_at = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            
            # Make ~70% of tickets resolved
            status = random.choice([TicketStatus.RESOLVED, TicketStatus.RESOLVED, TicketStatus.OPEN, TicketStatus.NEW])
            
            ticket = Ticket(
                organization_id=org.id,
                customer_id=customer.id,
                ticket_number=f"DEMO-{uuid.uuid4().hex[:8].upper()}",
                subject=random.choice(subjects),
                body="This is an automatically generated demo ticket.",
                status=status,
                category=random.choice(categories),
                priority=random.choice(priorities),
                created_at=created_at,
                updated_at=created_at
            )
            
            # Assign randomly
            if status != TicketStatus.NEW and agent_ids[0]:
                ticket.assigned_user_id = random.choice(agent_ids)
                ticket.assigned_team_id = random.choice(team_ids)
                
            if status == TicketStatus.RESOLVED:
                resolution_hours = random.randint(1, 48)
                ticket.resolved_at = created_at + timedelta(hours=resolution_hours)
                
            db.add(ticket)
            tickets.append(ticket)
            
        db.commit()
        
        # Generate some routing decisions for the tickets
        print("Generating AI routing decisions...")
        for ticket in tickets:
            if random.random() > 0.3: # 70% get a routing decision
                decision = RoutingDecision(
                    organization_id=org.id,
                    ticket_id=ticket.id,
                    predicted_category=ticket.category.value,
                    predicted_priority=ticket.priority.value,
                    assigned_agent_id=ticket.assigned_user_id,
                    assigned_team_id=ticket.assigned_team_id,
                    confidence_score=random.randint(65, 99),
                    reasoning="Based on keyword analysis, this ticket was routed to the best matching agent.",
                    created_at=ticket.created_at + timedelta(minutes=random.randint(1, 5))
                )
                db.add(decision)
                
        db.commit()
        
        print("Demo data generation complete! Data is ready for the Analytics Dashboard.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_demo_data()
