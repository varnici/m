export interface ProductBrand {
  id: string;
  name: string;
  price_kobo?: number;
}

export interface SubCategory {
  id: string;
  name: string;
  brands: ProductBrand[];
}

export interface RetailCategory {
  id: string;
  name: string;
  icon: any; // React Native Image source
  backgroundColor: string;
  subcategories: SubCategory[];
}

export const getCategoryInfo = (categoryId?: string) => {
  if (!categoryId) return null;
  const cat = retailCategoriesData.find(c => c.id === categoryId);
  if (cat) return cat;
  for (const c of retailCategoriesData) {
    if (c.subcategories) {
      const sub = c.subcategories.find(s => s.id === categoryId);
      if (sub) return c;
    }
  }
  return null;
};

export const retailCategoriesData: RetailCategory[] = [
  {
    id: "cat_food",
    name: "Food & Groceries",
    icon: require("../../assets/images/categories/food.png"),
    backgroundColor: "#FEE2E2", // Light Red/Coral
    subcategories: [
      {
        id: "sub_rice_pasta",
        name: "Rice, Pasta & Noodles",
        brands: [
          { id: "p1", name: "Mama Gold Rice 50kg" },
          { id: "p2", name: "Indomie Super Pack (Chicken)" },
          { id: "p3", name: "Indomie Onion Chicken" },
          { id: "p4", name: "Golden Penny Spaghetti" },
          { id: "p5", name: "Honeywell Macaroni" }
        ]
      },
      {
        id: "sub_oil_spices",
        name: "Oils & Spices",
        brands: [
          { id: "p6", name: "Kings Vegetable Oil 1L" },
          { id: "p7", name: "Power Oil 3L" },
          { id: "p8", name: "Knorr Chicken Cubes" },
          { id: "p9", name: "Maggi Star Cubes" },
          { id: "p10", name: "Ducros Thyme" }
        ]
      },
      {
        id: "sub_canned_foods",
        name: "Canned Foods",
        brands: [
          { id: "p11", name: "Gino Tomato Paste" },
          { id: "p12", name: "Geisha Mackerel in Tomato Sauce" },
          { id: "p13", name: "Titus Sardine" },
          { id: "p14", name: "Exeter Corned Beef" }
        ]
      }
    ]
  },
  {
    id: "cat_beverages",
    name: "Beverages & Drinks",
    icon: require("../../assets/images/categories/beverages.png"),
    backgroundColor: "#E0F2FE", // Light Blue
    subcategories: [
      {
        id: "sub_water_juice",
        name: "Water & Juices",
        brands: [
          { id: "p15", name: "Eva Table Water 75cl" },
          { id: "p16", name: "Nestle Pure Life 75cl" },
          { id: "p17", name: "Chivita 100% Fruit Juice" },
          { id: "p18", name: "5Alive Citrus" }
        ]
      },
      {
        id: "sub_carbonated",
        name: "Carbonated Drinks",
        brands: [
          { id: "p19", name: "Coca-Cola 50cl PET" },
          { id: "p20", name: "Fanta Orange 50cl" },
          { id: "p21", name: "Sprite 50cl" },
          { id: "p22", name: "Pepsi 50cl" },
          { id: "p23", name: "Maltina Classic" }
        ]
      },
      {
        id: "sub_tea_coffee",
        name: "Tea, Coffee & Cocoa",
        brands: [
          { id: "p24", name: "Milo Refill 500g" },
          { id: "p25", name: "Bournvita 500g" },
          { id: "p26", name: "Lipton Yellow Label Tea" },
          { id: "p27", name: "Nescafe Classic Coffee" }
        ]
      }
    ]
  },
  {
    id: "cat_bakery",
    name: "Bakery & Pastries",
    icon: require("../../assets/images/categories/bakery.png"),
    backgroundColor: "#FEF3C7", // Light Amber/Gold
    subcategories: [
      {
        id: "sub_bread",
        name: "Bread",
        brands: [
          { id: "p28", name: "Family Loaf (Sliced)" },
          { id: "p29", name: "Butter Bread" },
          { id: "p30", name: "Wheat Bread" },
          { id: "p31", name: "Coconut Bread" }
        ]
      },
      {
        id: "sub_snacks_biscuits",
        name: "Snacks & Biscuits",
        brands: [
          { id: "p32", name: "Digestive Biscuits" },
          { id: "p33", name: "Cabin Biscuits" },
          { id: "p34", name: "Pure Bliss Premium Wafers" },
          { id: "p35", name: "Gala Sausage Roll" },
          { id: "p36", name: "Superbite Sausage Roll" }
        ]
      }
    ]
  },
  {
    id: "cat_health_beauty",
    name: "Health & Beauty",
    icon: require("../../assets/images/categories/health.png"),
    backgroundColor: "#FCE7F3", // Light Pink
    subcategories: [
      {
        id: "sub_skin_care",
        name: "Skin Care",
        brands: [
          { id: "p37", name: "Nivea Nourishing Cocoa" },
          { id: "p38", name: "Vaseline Petroleum Jelly" },
          { id: "p39", name: "Dettol Antiseptic Soap" },
          { id: "p40", name: "Joy Beauty Soap" }
        ]
      },
      {
        id: "sub_oral_care",
        name: "Oral Care",
        brands: [
          { id: "p41", name: "CloseUp Red Hot" },
          { id: "p42", name: "Macleans Herbal" },
          { id: "p43", name: "Oral-B Toothbrush" },
          { id: "p44", name: "Pepsodent Cavity Fighter" }
        ]
      },
      {
        id: "sub_hair_care",
        name: "Hair Care",
        brands: [
          { id: "p45", name: "Head & Shoulders Shampoo" },
          { id: "p46", name: "Olive Oil Hair Relaxer" },
          { id: "p47", name: "Sportin Waves Pomade" }
        ]
      }
    ]
  },
  {
    id: "cat_home_cleaning",
    name: "Home & Cleaning",
    icon: require("../../assets/images/categories/home.png"),
    backgroundColor: "#D1FAE5", // Light Emerald/Mint
    subcategories: [
      {
        id: "sub_laundry",
        name: "Laundry",
        brands: [
          { id: "p48", name: "Ariel Washing Powder" },
          { id: "p49", name: "Omo Multi-Active" },
          { id: "p50", name: "Klin Detergent" },
          { id: "p51", name: "Morning Fresh Dishwashing Liquid" }
        ]
      },
      {
        id: "sub_surface_cleaners",
        name: "Surface & Air",
        brands: [
          { id: "p52", name: "Harpic Toilet Cleaner" },
          { id: "p53", name: "Dettol Antiseptic Liquid" },
          { id: "p54", name: "Air Wick Air Freshener" },
          { id: "p55", name: "Sniper Insecticide" }
        ]
      },
      {
        id: "sub_paper",
        name: "Paper Products",
        brands: [
          { id: "p56", name: "Rose Plus Toilet Roll" },
          { id: "p57", name: "Softwave Tissue Paper" },
          { id: "p58", name: "Kitchen Paper Towels" }
        ]
      }
    ]
  }
];
