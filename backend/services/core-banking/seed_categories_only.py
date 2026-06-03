import asyncio
import os
# No load_dotenv() - falls back to local Docker container on localhost:5432

from sqlalchemy.orm import Session
from app.infrastructure.database import SessionLocal
from app.models.inventory import Category
from app.models.user import User

retail_data = [
  {
    "id": "cat_food", "name": "Food & Groceries", "slug": "food-groceries",
    "subcategories": [
      {"id": "sub_rice_pasta", "name": "Rice, Pasta & Noodles"},
      {"id": "sub_oil_spices", "name": "Oils & Spices"},
      {"id": "sub_canned_foods", "name": "Canned Foods"}
    ]
  },
  {
    "id": "cat_beverages", "name": "Beverages & Drinks", "slug": "beverages",
    "subcategories": [
      {"id": "sub_water_juice", "name": "Water & Juices"},
      {"id": "sub_carbonated", "name": "Carbonated Drinks"},
      {"id": "sub_tea_coffee", "name": "Tea, Coffee & Cocoa"}
    ]
  },
  {
    "id": "cat_bakery", "name": "Bakery & Pastries", "slug": "bakery-pastries",
    "subcategories": [
      {"id": "sub_bread", "name": "Bread"},
      {"id": "sub_snacks_biscuits", "name": "Snacks & Biscuits"}
    ]
  },
  {
    "id": "cat_health_beauty", "name": "Health & Beauty", "slug": "health-beauty",
    "subcategories": [
      {"id": "sub_skin_care", "name": "Skin Care"},
      {"id": "sub_oral_care", "name": "Oral Care"},
      {"id": "sub_hair_care", "name": "Hair Care"}
    ]
  },
  {
    "id": "cat_home_cleaning", "name": "Home & Cleaning", "slug": "home-cleaning",
    "subcategories": [
      {"id": "sub_laundry", "name": "Laundry"},
      {"id": "sub_surface_cleaners", "name": "Surface & Air"},
      {"id": "sub_paper", "name": "Paper Products"}
    ]
  }
]

async def seed_categories_only():
    db: Session = SessionLocal()()
    try:
        from sqlalchemy import text
        # Resolve owner/user id using raw SQL to bypass SQLAlchemy column mismatches
        user_id = None
        try:
            res = db.execute(text("SELECT id FROM users LIMIT 1")).first()
            if res:
                user_id = res[0]
        except Exception:
            pass

        if not user_id:
            print("No users found. Creating a default developer user first...")
            user_id = "dev-user-12345"
            try:
                db.execute(text(
                    "INSERT INTO users (id, phone, email, full_name, category, trust_level) "
                    "VALUES ('dev-user-12345', '+2348012345678', 'dev@ventureroot.com', 'Developer Account', 'retailer', 'Gold')"
                ))
                db.flush()
            except Exception as e:
                print(f"User bootstrap warning: {e}")

        owner_id = user_id
        print(f"Seeding dynamic category mappings for user: {owner_id}")

        for cat_data in retail_data:
            # 1. Main Category
            main_cat = db.query(Category).filter(Category.id == cat_data["id"]).first()
            if not main_cat:
                main_cat = Category(
                    id=cat_data["id"],
                    owner_id=owner_id,
                    name=cat_data["name"],
                    slug=cat_data["slug"],
                    description=f"Local Market: {cat_data['name']}",
                    is_active=True
                )
                db.add(main_cat)
                print(f"Added category: {cat_data['name']}")
            else:
                main_cat.name = cat_data["name"]
            
            db.flush()

            # 2. Subcategories
            for sub_data in cat_data.get("subcategories", []):
                sub_cat = db.query(Category).filter(Category.id == sub_data["id"]).first()
                if not sub_cat:
                    sub_cat = Category(
                        id=sub_data["id"],
                        owner_id=owner_id,
                        name=sub_data["name"],
                        slug=sub_data["id"].replace("_", "-"),
                        parent_id=main_cat.id,
                        description=f"Subcategory of {cat_data['name']}",
                        is_active=True
                    )
                    db.add(sub_cat)
                    print(f"  Added subcategory: {sub_data['name']}")
                else:
                    sub_cat.name = sub_data["name"]
                    sub_cat.parent_id = main_cat.id
                
                db.flush()

        db.commit()
        print("Successfully seeded all category definitions! Product catalog remains clean for user creation.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database categories: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_categories_only())
