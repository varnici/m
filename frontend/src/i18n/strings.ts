export type LanguageCode = 'en' | 'pcm' | 'yo' | 'ig' | 'ha';

export interface InventoryStrings {
  name: string;
  inventory: string;
  register: string;
  sell: string;
  add: string;
  more: string;
  search: string;
  categories: string;
  subcats: string;
  inStock: string;
  low: string;
  out: string;
  qty: string;
  price: string;
  cost: string;
  balance: string;
  save: string;
  cancel: string;
  speak: string;
  today: string;
  total: string;
  confirm: string;
  stockIn: string;
  stockOut: string;
  newCat: string;
  expiry: string;
  unit: string;
  alertAt: string;
  count: string;
  report: string;
  allGoods: string;
  shopType: string;
}

/**
 * Inventory-screen string pack — English, Nigerian Pidgin, Yorùbá, Igbo,
 * Hausa. Scoped to the inventory module only (not an app-wide i18n pass).
 * Local-language strings are a first pass and need native-speaker review
 * before release.
 */
export const STRINGS: Record<LanguageCode, InventoryStrings> = {
  en: {
    name: 'English',
    inventory: 'Inventory', register: 'Register', sell: 'Issue', add: 'Add', more: 'Reports',
    search: 'Search product or code', categories: 'Categories', subcats: 'Sub-categories',
    inStock: 'In stock', low: 'Reorder', out: 'Out of stock',
    qty: 'Quantity', price: 'Selling price', cost: 'Cost price', balance: 'Balance',
    save: 'Save', cancel: 'Cancel', speak: 'Hold to speak', today: 'Today',
    total: 'Total', confirm: 'Is this correct?', stockIn: 'Receive stock', stockOut: 'Issue stock',
    newCat: 'New category', expiry: 'Expiry date', unit: 'Unit of sale',
    alertAt: 'Reorder level', count: 'Stock count', report: 'Daily report',
    allGoods: 'All products', shopType: 'What does your business sell?',
  },
  pcm: {
    name: 'Pidgin',
    inventory: 'My goods', register: 'Full book', sell: 'Sell am', add: 'Add new', more: 'Report',
    search: 'Find your goods', categories: 'Groups', subcats: 'Small groups',
    inStock: 'E plenty', low: 'E dey finish', out: 'E don finish',
    qty: 'How many', price: 'Wetin you dey sell am', cost: 'Wetin you buy am', balance: 'Wetin remain',
    save: 'Save am', cancel: 'Leave am', speak: 'Hold am talk', today: 'Today',
    total: 'Everything', confirm: 'Na so e be?', stockIn: 'Goods enter', stockOut: 'Goods comot',
    newCat: 'New group', expiry: 'When e go expire', unit: 'How you dey sell am',
    alertAt: 'Tell me when e reach', count: 'Count your goods', report: 'Today report',
    allGoods: 'All my goods', shopType: 'Wetin your business dey sell?',
  },
  yo: {
    name: 'Yorùbá',
    inventory: 'Ẹrù mi', register: 'Ìwé ẹrù', sell: 'Tà', add: 'Fi kún', more: 'Ìròyìn',
    search: 'Wá ẹrù', categories: 'Ẹ̀ka', subcats: 'Ẹ̀ka kékeré',
    inStock: 'Ó wà', low: 'Ó ń tán', out: 'Ó tán',
    qty: 'Iye', price: 'Owó títà', cost: 'Owó rírà', balance: 'Èyí tó kù',
    save: 'Fi pamọ́', cancel: 'Fagilé', speak: 'Tẹ̀ kí o sọ̀rọ̀', today: 'Òní',
    total: 'Àpapọ̀', confirm: 'Ṣé bẹ́ẹ̀ ni?', stockIn: 'Ẹrù wọlé', stockOut: 'Ẹrù jáde',
    newCat: 'Ẹ̀ka tuntun', expiry: 'Ọjọ́ ìparí', unit: 'Bí o ṣe ń tà á',
    alertAt: 'Ìwọ̀n ìkìlọ̀', count: 'Ka ẹrù', report: 'Ìròyìn òní',
    allGoods: 'Gbogbo ẹrù', shopType: 'Kí ni iṣẹ́ rẹ ń tà?',
  },
  ig: {
    name: 'Igbo',
    inventory: 'Ngwongwo m', register: 'Akwụkwọ ngwongwo', sell: 'Ree', add: 'Tinye', more: 'Akụkọ',
    search: 'Chọọ ngwongwo', categories: 'Ụdị', subcats: 'Ụdị nta',
    inStock: 'Ọ dị', low: 'Ọ na-agwụ', out: 'Ọ gwụla',
    qty: 'Ole', price: 'Ọnụ ire', cost: 'Ọnụ ọzụzụ', balance: 'Nke fọdụrụ',
    save: 'Chekwaa', cancel: 'Kagbuo', speak: 'Pịa kwuo', today: 'Taa',
    total: 'Ngụkọta', confirm: 'Ọ bụ otu a?', stockIn: 'Ngwongwo batara', stockOut: 'Ngwongwo pụrụ',
    newCat: 'Ụdị ọhụrụ', expiry: 'Ụbọchị njedebe', unit: 'Otú i si ere ya',
    alertAt: 'Ọkwa mgbe ọ ruru', count: 'Gụọ ngwongwo', report: 'Akụkọ taa',
    allGoods: 'Ngwongwo niile', shopType: 'Gịnị ka azụmahịa gị na-ere?',
  },
  ha: {
    name: 'Hausa',
    inventory: 'Kayana', register: 'Littafin kaya', sell: 'Sayarwa', add: 'Ƙara', more: 'Rahoto',
    search: 'Nemo kaya', categories: 'Rukuni', subcats: 'Ƙananan rukuni',
    inStock: 'Yana nan', low: 'Yana ƙarewa', out: 'Ya ƙare',
    qty: 'Nawa', price: 'Farashin sayarwa', cost: 'Farashin saya', balance: 'Sauran',
    save: 'Ajiye', cancel: 'Soke', speak: 'Riƙe ka yi magana', today: 'Yau',
    total: 'Jimla', confirm: 'Haka ne?', stockIn: 'Karɓar kaya', stockOut: 'Fitar da kaya',
    newCat: 'Sabon rukuni', expiry: 'Ranar ƙarewa', unit: 'Yadda kake sayarwa',
    alertAt: 'Matakin sake saya', count: 'Ƙidaya kaya', report: 'Rahoton yau',
    allGoods: 'Dukan kaya', shopType: 'Me kasuwancin ka ke sayarwa?',
  },
};

export const LANGUAGE_LIST: LanguageCode[] = ['en', 'pcm', 'yo', 'ig', 'ha'];
