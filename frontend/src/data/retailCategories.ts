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
  icon: any;
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
    id: "cat_fmcg",
    name: "FMCG / Groceries",
    icon: require("../../assets/images/categories/food.png"),
    backgroundColor: "#FEE2E2",
    subcategories: [
      {
        id: "sub_rice_pasta",
        name: "Rice, Pasta & Noodles",
        brands: [
          { id: "p1", name: "Mama Gold Rice 50kg" },
          { id: "p2", name: "Indomie Super Pack (Chicken)" },
          { id: "p3", name: "Golden Penny Spaghetti" },
          { id: "p4", name: "Honeywell Macaroni" },
          { id: "p5", name: "Dangote Rice 50kg" },
        ]
      },
      {
        id: "sub_oil_spices",
        name: "Oils, Spices & Seasoning",
        brands: [
          { id: "p6", name: "Kings Vegetable Oil 1L" },
          { id: "p7", name: "Power Oil 3L" },
          { id: "p8", name: "Knorr Chicken Cubes" },
          { id: "p9", name: "Maggi Star Cubes" },
          { id: "p10", name: "Devon King's Palm Oil" },
        ]
      },
      {
        id: "sub_canned_foods",
        name: "Canned & Packaged Foods",
        brands: [
          { id: "p11", name: "Gino Tomato Paste" },
          { id: "p12", name: "Geisha Mackerel" },
          { id: "p13", name: "Titus Sardine" },
          { id: "p14", name: "Dangote Sugar 1kg" },
        ]
      },
      {
        id: "sub_flour_baking",
        name: "Flour & Baking",
        brands: [
          { id: "p200", name: "Golden Penny Flour 2kg" },
          { id: "p201", name: "Honeywell Flour 2kg" },
          { id: "p202", name: "Devon King's Yeast" },
        ]
      },
    ]
  },
  {
    id: "cat_textiles",
    name: "Textiles & Clothing",
    icon: require("../../assets/images/categories/food.png"),
    backgroundColor: "#EDE9FE",
    subcategories: [
      {
        id: "sub_mens_wear",
        name: "Men's Clothing",
        brands: [
          { id: "p100", name: "Ankara Fabric (6 yards)" },
          { id: "p101", name: "Guinea Brocade" },
          { id: "p102", name: "Senator Wear Set" },
        ]
      },
      {
        id: "sub_womens_wear",
        name: "Women's Clothing",
        brands: [
          { id: "p103", name: "Lace Material (5 yards)" },
          { id: "p104", name: "Aso-Oke Bundle" },
          { id: "p105", name: "Adire Fabric" },
        ]
      },
      {
        id: "sub_footwear",
        name: "Footwear & Accessories",
        brands: [
          { id: "p106", name: "Leather Sandals" },
          { id: "p107", name: "Canvas Sneakers" },
          { id: "p108", name: "Handbags" },
        ]
      },
    ]
  },
  {
    id: "cat_electronics",
    name: "Electronics & Phones",
    icon: require("../../assets/images/categories/food.png"),
    backgroundColor: "#DBEAFE",
    subcategories: [
      {
        id: "sub_phones",
        name: "Mobile Phones & Tablets",
        brands: [
          { id: "p110", name: "Tecno Spark Series" },
          { id: "p111", name: "Infinix Hot Series" },
          { id: "p112", name: "Samsung Galaxy A Series" },
          { id: "p113", name: "iPhone (Refurbished)" },
        ]
      },
      {
        id: "sub_accessories",
        name: "Phone Accessories",
        brands: [
          { id: "p114", name: "USB Chargers" },
          { id: "p115", name: "Phone Cases" },
          { id: "p116", name: "Earphones / Bluetooth" },
          { id: "p117", name: "Screen Protectors" },
        ]
      },
      {
        id: "sub_appliances",
        name: "Home Appliances",
        brands: [
          { id: "p118", name: "Standing Fan" },
          { id: "p119", name: "Electric Kettle" },
          { id: "p120", name: "Blender" },
          { id: "p121", name: "Iron / Pressing Iron" },
        ]
      },
    ]
  },
  {
    id: "cat_pharma",
    name: "Pharmaceuticals",
    icon: require("../../assets/images/categories/health.png"),
    backgroundColor: "#FCE7F3",
    subcategories: [
      {
        id: "sub_otc",
        name: "Over-The-Counter Drugs",
        brands: [
          { id: "p130", name: "Paracetamol (Emzor)" },
          { id: "p131", name: "Ibuprofen" },
          { id: "p132", name: "Vitamin C Tablets" },
          { id: "p133", name: "Lonart (Antimalarial)" },
        ]
      },
      {
        id: "sub_first_aid",
        name: "First Aid & Medical Supplies",
        brands: [
          { id: "p134", name: "Bandages & Cotton Wool" },
          { id: "p135", name: "Methylated Spirit" },
          { id: "p136", name: "Plasters" },
        ]
      },
      {
        id: "sub_wellness",
        name: "Wellness & Supplements",
        brands: [
          { id: "p137", name: "Multivitamins" },
          { id: "p138", name: "Blood Tonic" },
          { id: "p139", name: "Herbal Mixtures" },
        ]
      },
    ]
  },
  {
    id: "cat_agriculture",
    name: "Agriculture & Farm Produce",
    icon: require("../../assets/images/categories/food.png"),
    backgroundColor: "#D1FAE5",
    subcategories: [
      {
        id: "sub_grains",
        name: "Grains & Tubers",
        brands: [
          { id: "p140", name: "Maize (Corn) per bag" },
          { id: "p141", name: "Beans (Oloyin/Honey)" },
          { id: "p142", name: "Yam Tubers" },
          { id: "p143", name: "Garri (White/Yellow)" },
        ]
      },
      {
        id: "sub_livestock",
        name: "Livestock & Poultry Feed",
        brands: [
          { id: "p144", name: "Vital Feed (Layers)" },
          { id: "p145", name: "Top Feed (Broilers)" },
          { id: "p146", name: "Fish Feed (Coppens)" },
        ]
      },
      {
        id: "sub_agro_inputs",
        name: "Agro Chemicals & Inputs",
        brands: [
          { id: "p147", name: "NPK Fertilizer" },
          { id: "p148", name: "Herbicide" },
          { id: "p149", name: "Pesticide Spray" },
        ]
      },
    ]
  },
  {
    id: "cat_building",
    name: "Building Materials",
    icon: require("../../assets/images/categories/home.png"),
    backgroundColor: "#FEF3C7",
    subcategories: [
      {
        id: "sub_cement_blocks",
        name: "Cement & Blocks",
        brands: [
          { id: "p150", name: "Dangote Cement 50kg" },
          { id: "p151", name: "BUA Cement 50kg" },
          { id: "p152", name: "Lafarge Cement" },
        ]
      },
      {
        id: "sub_iron_steel",
        name: "Iron Rods & Steel",
        brands: [
          { id: "p153", name: "12mm Iron Rod" },
          { id: "p154", name: "16mm Iron Rod" },
          { id: "p155", name: "Binding Wire" },
        ]
      },
      {
        id: "sub_plumbing_electrical",
        name: "Plumbing & Electrical",
        brands: [
          { id: "p156", name: "PVC Pipes" },
          { id: "p157", name: "Armoured Cable" },
          { id: "p158", name: "Light Switches" },
          { id: "p159", name: "Water Closet (WC)" },
        ]
      },
    ]
  },
  {
    id: "cat_cosmetics",
    name: "Cosmetics & Beauty",
    icon: require("../../assets/images/categories/health.png"),
    backgroundColor: "#FDF2F8",
    subcategories: [
      {
        id: "sub_skincare",
        name: "Skin Care",
        brands: [
          { id: "p37", name: "Nivea Nourishing Cocoa" },
          { id: "p38", name: "Vaseline Petroleum Jelly" },
          { id: "p160", name: "Jergens Lotion" },
          { id: "p161", name: "Fair & White Cream" },
        ]
      },
      {
        id: "sub_haircare",
        name: "Hair Care",
        brands: [
          { id: "p45", name: "Head & Shoulders Shampoo" },
          { id: "p46", name: "Olive Oil Hair Relaxer" },
          { id: "p162", name: "Darling Attachments" },
          { id: "p163", name: "Hair Wigs" },
        ]
      },
      {
        id: "sub_makeup",
        name: "Makeup & Fragrances",
        brands: [
          { id: "p164", name: "Foundation" },
          { id: "p165", name: "Lipstick" },
          { id: "p166", name: "Perfume / Body Spray" },
        ]
      },
    ]
  },
  {
    id: "cat_beverages",
    name: "Beverages & Drinks",
    icon: require("../../assets/images/categories/beverages.png"),
    backgroundColor: "#E0F2FE",
    subcategories: [
      {
        id: "sub_water_juice",
        name: "Water & Juices",
        brands: [
          { id: "p15", name: "Eva Table Water 75cl" },
          { id: "p16", name: "Nestle Pure Life 75cl" },
          { id: "p17", name: "Chivita 100% Fruit Juice" },
          { id: "p18", name: "5Alive Citrus" },
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
          { id: "p23", name: "Maltina Classic" },
        ]
      },
      {
        id: "sub_tea_coffee",
        name: "Tea, Coffee & Cocoa",
        brands: [
          { id: "p24", name: "Milo Refill 500g" },
          { id: "p25", name: "Bournvita 500g" },
          { id: "p26", name: "Lipton Yellow Label Tea" },
          { id: "p27", name: "Nescafe Classic Coffee" },
        ]
      },
    ]
  },
  {
    id: "cat_food_prep",
    name: "Food & Beverage Preparation",
    icon: require("../../assets/images/categories/bakery.png"),
    backgroundColor: "#FEF3C7",
    subcategories: [
      {
        id: "sub_cooked_meals",
        name: "Cooked Meals & Catering",
        brands: [
          { id: "p170", name: "Rice & Stew (plate)" },
          { id: "p171", name: "Jollof Rice (party pack)" },
          { id: "p172", name: "Amala & Ewedu" },
        ]
      },
      {
        id: "sub_snacks",
        name: "Snacks & Pastries",
        brands: [
          { id: "p32", name: "Digestive Biscuits" },
          { id: "p35", name: "Gala Sausage Roll" },
          { id: "p173", name: "Meat Pie" },
          { id: "p174", name: "Puff Puff" },
        ]
      },
      {
        id: "sub_bread",
        name: "Bread & Bakery",
        brands: [
          { id: "p28", name: "Family Loaf (Sliced)" },
          { id: "p29", name: "Butter Bread" },
          { id: "p30", name: "Wheat Bread" },
        ]
      },
    ]
  },
  {
    id: "cat_stationery",
    name: "Stationery & Office Supplies",
    icon: require("../../assets/images/categories/home.png"),
    backgroundColor: "#E0E7FF",
    subcategories: [
      {
        id: "sub_paper_printing",
        name: "Paper & Printing",
        brands: [
          { id: "p180", name: "A4 Paper Ream" },
          { id: "p181", name: "Printer Ink Cartridge" },
          { id: "p182", name: "Toner (HP/Canon)" },
        ]
      },
      {
        id: "sub_writing",
        name: "Writing & Drawing",
        brands: [
          { id: "p183", name: "BIC Biro Pens" },
          { id: "p184", name: "Exercise Books (40/60 leaves)" },
          { id: "p185", name: "Markers & Highlighters" },
        ]
      },
      {
        id: "sub_office_equip",
        name: "Office Equipment",
        brands: [
          { id: "p186", name: "Stapler" },
          { id: "p187", name: "Calculator" },
          { id: "p188", name: "Files & Folders" },
        ]
      },
    ]
  },
  {
    id: "cat_auto_parts",
    name: "Auto Parts",
    icon: require("../../assets/images/categories/home.png"),
    backgroundColor: "#F3F4F6",
    subcategories: [
      {
        id: "sub_engine",
        name: "Engine & Mechanical Parts",
        brands: [
          { id: "p190", name: "Brake Pads" },
          { id: "p191", name: "Air Filter" },
          { id: "p192", name: "Spark Plugs" },
        ]
      },
      {
        id: "sub_lubricants",
        name: "Lubricants & Fluids",
        brands: [
          { id: "p193", name: "Total Quartz Engine Oil" },
          { id: "p194", name: "Mobil 1 Engine Oil" },
          { id: "p195", name: "Brake Fluid" },
        ]
      },
      {
        id: "sub_car_accessories",
        name: "Car Accessories",
        brands: [
          { id: "p196", name: "Car Battery (Solite)" },
          { id: "p197", name: "Tyres (Dunlop/Bridgestone)" },
          { id: "p198", name: "Wiper Blades" },
        ]
      },
    ]
  },
  {
    id: "cat_home_cleaning",
    name: "Home & Cleaning",
    icon: require("../../assets/images/categories/home.png"),
    backgroundColor: "#D1FAE5",
    subcategories: [
      {
        id: "sub_laundry",
        name: "Laundry",
        brands: [
          { id: "p48", name: "Ariel Washing Powder" },
          { id: "p49", name: "Omo Multi-Active" },
          { id: "p50", name: "Klin Detergent" },
          { id: "p51", name: "Morning Fresh Dishwashing Liquid" },
        ]
      },
      {
        id: "sub_surface_cleaners",
        name: "Surface & Air",
        brands: [
          { id: "p52", name: "Harpic Toilet Cleaner" },
          { id: "p53", name: "Dettol Antiseptic Liquid" },
          { id: "p54", name: "Air Wick Air Freshener" },
          { id: "p55", name: "Sniper Insecticide" },
        ]
      },
      {
        id: "sub_paper",
        name: "Paper Products",
        brands: [
          { id: "p56", name: "Rose Plus Toilet Roll" },
          { id: "p57", name: "Softwave Tissue Paper" },
          { id: "p58", name: "Kitchen Paper Towels" },
        ]
      },
    ]
  },
];
