
import asyncio
from sqlalchemy.orm import Session
from app.infrastructure.database import SessionLocal
from app.models.inventory import Category, Product
from app.models.user import User

retail_data = [
  {
    "id": "cat_food", "name": "Food & Groceries", "slug": "food-groceries",
    "subcategories": [
      {
        "id": "sub_rice_pasta", "name": "Rice, Pasta & Noodles",
        "brands": [
          {"id": "p1", "name": "Mama Gold Rice 50kg"},
          {"id": "p2", "name": "Indomie Super Pack (Chicken)"},
          {"id": "p3", "name": "Indomie Onion Chicken"},
          {"id": "p4", "name": "Golden Penny Spaghetti"},
          {"id": "p5", "name": "Honeywell Macaroni"}
        ]
      },
      {
        "id": "sub_oil_spices", "name": "Oils & Spices",
        "brands": [
          {"id": "p6", "name": "Kings Vegetable Oil 1L"},
          {"id": "p7", "name": "Power Oil 3L"},
          {"id": "p8", "name": "Knorr Chicken Cubes"},
          {"id": "p9", "name": "Maggi Star Cubes"},
          {"id": "p10", "name": "Ducros Thyme"}
        ]
      },
      {
        "id": "sub_canned_foods", "name": "Canned Foods",
        "brands": [
          {"id": "p11", "name": "Gino Tomato Paste"},
          {"id": "p12", "name": "Geisha Mackerel in Tomato Sauce"},
          {"id": "p13", "name": "Titus Sardine"},
          {"id": "p14", "name": "Exeter Corned Beef"}
        ]
      }
    ]
  },
  {
    "id": "cat_beverages", "name": "Beverages & Drinks", "slug": "beverages",
    "subcategories": [
      {
        "id": "sub_water_juice", "name": "Water & Juices",
        "brands": [
          {"id": "p15", "name": "Eva Table Water 75cl"},
          {"id": "p16", "name": "Nestle Pure Life 75cl"},
          {"id": "p17", "name": "Chivita 100% Fruit Juice"},
          {"id": "p18", "name": "5Alive Citrus"}
        ]
      },
      {
        "id": "sub_carbonated", "name": "Carbonated Drinks",
        "brands": [
          {"id": "p19", "name": "Coca-Cola 50cl PET"},
          {"id": "p20", "name": "Fanta Orange 50cl"},
          {"id": "p21", "name": "Sprite 50cl"},
          {"id": "p22", "name": "Pepsi 50cl"},
          {"id": "p23", "name": "Maltina Classic"}
        ]
      },
      {
        "id": "sub_tea_coffee", "name": "Tea, Coffee & Cocoa",
        "brands": [
          {"id": "p24", "name": "Milo Refill 500g"},
          {"id": "p25", "name": "Bournvita 500g"},
          {"id": "p26", "name": "Lipton Yellow Label Tea"},
          {"id": "p27", "name": "Nescafe Classic Coffee"}
        ]
      }
    ]
  },
  {
    "id": "cat_bakery", "name": "Bakery & Pastries", "slug": "bakery-pastries",
    "subcategories": [
      {
        "id": "sub_bread", "name": "Bread",
        "brands": [
          {"id": "p28", "name": "Family Loaf (Sliced)"},
          {"id": "p29", "name": "Butter Bread"},
          {"id": "p30", "name": "Wheat Bread"},
          {"id": "p31", "name": "Coconut Bread"}
        ]
      },
      {
        "id": "sub_snacks_biscuits", "name": "Snacks & Biscuits",
        "brands": [
          {"id": "p32", "name": "Digestive Biscuits"},
          {"id": "p33", "name": "Cabin Biscuits"},
          {"id": "p34", "name": "Pure Bliss Premium Wafers"},
          {"id": "p35", "name": "Gala Sausage Roll"},
          {"id": "p36", "name": "Superbite Sausage Roll"}
        ]
      }
    ]
  },
  {
    "id": "cat_health_beauty", "name": "Health & Beauty", "slug": "health-beauty",
    "subcategories": [
      {
        "id": "sub_skin_care", "name": "Skin Care",
        "brands": [
          {"id": "p37", "name": "Nivea Nourishing Cocoa"},
          {"id": "p38", "name": "Vaseline Petroleum Jelly"},
          {"id": "p39", "name": "Dettol Antiseptic Soap"},
          {"id": "p40", "name": "Joy Beauty Soap"}
        ]
      },
      {
        "id": "sub_oral_care", "name": "Oral Care",
        "brands": [
          {"id": "p41", "name": "CloseUp Red Hot"},
          {"id": "p42", "name": "Macleans Herbal"},
          {"id": "p43", "name": "Oral-B Toothbrush"},
          {"id": "p44", "name": "Pepsodent Cavity Fighter"}
        ]
      },
      {
        "id": "sub_hair_care", "name": "Hair Care",
        "brands": [
          {"id": "p45", "name": "Head & Shoulders Shampoo"},
          {"id": "p46", "name": "Olive Oil Hair Relaxer"},
          {"id": "p47", "name": "Sportin Waves Pomade"}
        ]
      }
    ]
  },
  {
    "id": "cat_home_cleaning", "name": "Home & Cleaning", "slug": "home-cleaning",
    "subcategories": [
      {
        "id": "sub_laundry", "name": "Laundry",
        "brands": [
          {"id": "p48", "name": "Ariel Washing Powder"},
          {"id": "p49", "name": "Omo Multi-Active"},
          {"id": "p50", "name": "Klin Detergent"},
          {"id": "p51", "name": "Morning Fresh Dishwashing Liquid"}
        ]
      },
      {
        "id": "sub_surface_cleaners", "name": "Surface & Air",
        "brands": [
          {"id": "p52", "name": "Harpic Toilet Cleaner"},
          {"id": "p53", "name": "Dettol Antiseptic Liquid"},
          {"id": "p54", "name": "Air Wick Air Freshener"},
          {"id": "p55", "name": "Sniper Insecticide"}
        ]
      },
      {
        "id": "sub_paper", "name": "Paper Products",
        "brands": [
          {"id": "p56", "name": "Rose Plus Toilet Roll"},
          {"id": "p57", "name": "Softwave Tissue Paper"},
          {"id": "p58", "name": "Kitchen Paper Towels"}
        ]
      }
    ]
  }
]

async def seed_categories_and_products():
    db: Session = SessionLocal()()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found. Please create a user first.")
            return

        owner_id = user.id
        print(f"Seeding full local market database for user: {owner_id}")

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

                # 3. Brands / Products
                for brand in sub_data.get("brands", []):
                    # We use the brand ID from frontend, but prepend with 'seed_'
                    # so we don't conflict with future UUIDs
                    prod_id = f"seed_{brand['id']}"
                    prod = db.query(Product).filter(Product.id == prod_id).first()
                    if not prod:
                        import random
                        # Generate a mock barcode if needed, or leave sku empty
                        sku = f"890{random.randint(10000000, 99999999)}"
                        prod = Product(
                            id=prod_id,
                            owner_id=owner_id,
                            category_id=sub_cat.id,
                            name=brand["name"],
                            description=f"{brand['name']} - Pre-seeded local market product.",
                            sku=sku,
                            barcode=sku,
                            unit_of_measure="pcs",
                            cost_price_kobo=0,
                            selling_price_kobo=0,
                            minimum_stock_level=5,
                            is_active=True
                        )
                        db.add(prod)
                        print(f"    Added product: {brand['name']} (SKU: {sku})")
                    else:
                        prod.name = brand["name"]
                        prod.category_id = sub_cat.id

        db.commit()
        print("Successfully seeded all categories, subcategories, and local market products!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_categories_and_products())
