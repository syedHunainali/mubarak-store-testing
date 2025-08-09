// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, setDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyCJnref7x3qqdtlFGtt-c6lZjUcmlfYK0I",
    authDomain: "herbal-pansar.firebaseapp.com",
    projectId: "herbal-pansar",
    storageBucket: "herbal-pansar.appspot.com",
    messagingSenderId: "983071124936",
    appId: "1:983071124936:web:48a7cdd989a0d94d77e4fd",
    measurementId: "G-CR0L1L84WP"
};

// Initialize Firebase and Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- PERFORMANCE OPTIMIZATIONS ---
// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Document fragment for better DOM performance
function createDocumentFragment() {
    return document.createDocumentFragment();
}

// --- STATE MANAGEMENT ---
let allProducts = [];
let cart = [];
let lastViewedCategory = 'home';
let currentUser = null;
let desktopSlideIndex = 1;
let desktopSlideInterval;
let mobileSlideIndex = 0;
let lastScrollY = 0;
let tooltipShown = false; // Track if appointment tooltip has been shown
let currentProductForImageUpdate = null; // Track which product is being updated

// --- CACHED DOM ELEMENTS ---
const elements = {
    pages: document.querySelectorAll('.page'),
    cartTotalHeaderEl: document.getElementById('cart-total-header'),
    cartItemCountBadgeEl: document.querySelector('.cart-item-count-badge'),
    cartViewContainerEl: document.getElementById('cart-view-container'),
    checkoutFormEl: document.getElementById('checkout-form-element'),
    productDetailContentEl: document.getElementById('product-detail-content'),
    searchInputEl: document.getElementById('search-input'),
    mobileSearchInputEl: document.getElementById('mobile-search-input'),
    authControlsEl: document.getElementById('auth-controls'),
    loginFormEl: document.getElementById('login-form'),
    signupFormEl: document.getElementById('signup-form'),
    ordersListEl: document.getElementById('orders-list'),
    appointmentsListEl: document.getElementById('appointments-list'),
    addProductFormEl: document.getElementById('add-product-form'),
    appointmentFormEl: document.getElementById('appointment-form'),
    modalEl: document.getElementById('custom-modal'),
    modalMessageEl: document.getElementById('modal-message'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    mainHeader: document.getElementById('main-header'),
    mobileSearchOverlay: document.getElementById('mobile-search-overlay'),
    mobileMenuOverlay: document.getElementById('mobile-menu-overlay'),
    mobileMenuSidebar: document.getElementById('mobile-menu-sidebar'),
    appointmentTooltip: document.getElementById('appointment-tooltip'),
    imageUpdateModal: document.getElementById('image-update-modal'),
    imageUpdateForm: document.getElementById('image-update-form')
};

// --- IMAGE UPDATE FUNCTIONS ---
window.openImageUpdateModal = function(productId) {
    currentProductForImageUpdate = productId;
    const product = allProducts.find(p => p.id === productId);
    if (product) {
        document.getElementById('update-image-filename').value = product.image.split('/').pop(); // Get filename from path
    }
    elements.imageUpdateModal.classList.remove('hidden');
}

window.closeImageUpdateModal = function() {
    currentProductForImageUpdate = null;
    document.getElementById('update-image-filename').value = '';
    elements.imageUpdateModal.classList.add('hidden');
}

// --- 300 PRODUCTS DATA ---
const productsData = [
    // Dry Fruits (50 products)
    {
        name: "Premium Almonds - 1KG",
        price: 2500,
        category: "dry-fruits",
        description: "High-quality California almonds, rich in vitamin E, healthy fats, and protein. Perfect for snacking, baking, or adding to breakfast cereals. These premium almonds are carefully selected for their superior taste and nutritional value. They help in maintaining heart health, supporting brain function, and providing sustained energy throughout the day. Our almonds are naturally grown without any artificial additives or preservatives.",
        image: "images/almonds-1kg.jpg",
        reviews: [
            { name: "Ahmed Hassan", rating: 5, comment: "Excellent quality almonds! Fresh and tasty. Will definitely order again." },
            { name: "Fatima Sheikh", rating: 5, comment: "Best almonds in Karachi. Perfect for my daily breakfast routine." },
            { name: "Muhammad Ali", rating: 4, comment: "Good quality but slightly expensive. Worth it for the freshness." }
        ]
    },
    {
        name: "Dried Dates Khajoor - 500g",
        price: 800,
        category: "dry-fruits",
        description: "Premium quality Medjool dates imported from the Middle East. These natural sweet treats are packed with fiber, potassium, and antioxidants. Traditionally used during Ramadan and special occasions, these dates provide instant energy and are excellent for digestive health. They have a soft, chewy texture with a rich, honey-like flavor. Perfect for making date syrup or enjoying as a healthy snack.",
        image: "images/dates-500g.jpg",
        reviews: [
            { name: "Aisha Khan", rating: 5, comment: "These dates are incredibly sweet and fresh. Perfect for Iftar!" },
            { name: "Omar Malik", rating: 5, comment: "Best quality dates I've found in Pakistan. Highly recommended." },
            { name: "Zainab Ali", rating: 4, comment: "Very good quality, though I wish they were a bit softer." }
        ]
    },
    {
        name: "Mixed Dry Fruits - 1KG",
        price: 3200,
        category: "dry-fruits",
        description: "A premium assortment of the finest dry fruits including almonds, walnuts, cashews, pistachios, raisins, and dates. This carefully curated mix provides a perfect balance of nutrients, healthy fats, and natural sweetness. Ideal for gifting during festivals or as a healthy snack option for the whole family. Each component is hand-selected for quality and freshness.",
        image: "images/mixed-dry-fruits-1kg.jpg",
        reviews: [
            { name: "Sana Ahmed", rating: 5, comment: "Perfect mix of all my favorite dry fruits. Great for guests!" },
            { name: "Hassan Sheikh", rating: 4, comment: "Good variety and fresh quality. Kids love this mix." },
            { name: "Mariam Khan", rating: 5, comment: "Excellent packaging and premium quality. Worth every penny." }
        ]
    },
    {
        name: "Cashew Nuts - 500g",
        price: 2200,
        category: "dry-fruits",
        description: "Premium whole cashew nuts sourced from the finest plantations. These kidney-shaped nuts are rich in copper, magnesium, and healthy monounsaturated fats. Known for their creamy texture and mild, buttery flavor, cashews are perfect for cooking, baking, or eating as a nutritious snack. They support heart health and provide essential minerals for bone strength.",
        image: "images/cashews-500g.jpg",
        reviews: [
            { name: "Tariq Hassan", rating: 5, comment: "Best cashews in town! Fresh and crunchy." },
            { name: "Nadia Ali", rating: 5, comment: "Perfect for making cashew milk and cooking. Top quality!" },
            { name: "Imran Sheikh", rating: 4, comment: "Good quality but could be a bit cheaper." }
        ]
    },
    {
        name: "Walnuts Akhrot - 500g",
        price: 1800,
        category: "dry-fruits",
        description: "Fresh, premium quality walnuts known for their omega-3 fatty acids and brain-boosting properties. These Chilean walnuts have a rich, slightly bitter taste and are excellent for heart health, brain function, and reducing inflammation. Perfect for baking, cooking, or eating raw as a healthy snack. They're also great for making walnut oil or adding to salads.",
        image: "images/walnuts-500g.jpg",
        reviews: [
            { name: "Dr. Sarah Khan", rating: 5, comment: "As a nutritionist, I recommend these walnuts for their omega-3 content." },
            { name: "Ali Hassan", rating: 4, comment: "Good quality walnuts. Perfect for my morning oatmeal." },
            { name: "Farah Ahmed", rating: 5, comment: "Fresh and tasty. Great for brain health!" }
        ]
    },
    {
        name: "Pistachios Pista - 250g",
        price: 1500,
        category: "dry-fruits",
        description: "Premium salted pistachios with their natural shells, imported from Iran. These green gems are packed with protein, fiber, and antioxidants. Known for their distinctive flavor and satisfying crunch, pistachios are perfect for snacking and help in weight management due to their protein content. They also support eye health with their lutein and zeaxanthin content.",
        image: "images/pistachios-250g.jpg",
        reviews: [
            { name: "Kamran Ali", rating: 5, comment: "Love these pistachios! Perfect saltiness and very fresh." },
            { name: "Ayesha Sheikh", rating: 4, comment: "Good quality but wish the pack size was bigger." },
            { name: "Bilal Khan", rating: 5, comment: "Best pistachios I've had. Great for movie nights!" }
        ]
    },
    {
        name: "Raisins Kishmish - 500g",
        price: 600,
        category: "dry-fruits",
        description: "Sweet, sun-dried raisins from the finest grapes. These golden raisins are rich in iron, potassium, and natural sugars. They're excellent for boosting energy levels, improving digestion, and supporting bone health. Perfect for baking, cooking, or eating as a healthy snack. Our raisins are naturally processed without any artificial preservatives or added sugars.",
        image: "images/raisins-500g.jpg",
        reviews: [
            { name: "Rukhsana Bibi", rating: 5, comment: "Sweet and fresh raisins. Perfect for my homemade cookies." },
            { name: "Shahid Ali", rating: 4, comment: "Good quality raisins. Great value for money." },
            { name: "Maryam Sheikh", rating: 5, comment: "My kids love these raisins as a healthy snack alternative." }
        ]
    },
    {
        name: "Pine Nuts Chilgoza - 100g",
        price: 2000,
        category: "dry-fruits",
        description: "Rare and precious pine nuts harvested from the high mountains of Pakistan and Afghanistan. These delicate, buttery nuts are considered a luxury ingredient and are packed with healthy fats, protein, and minerals. They have a sweet, creamy flavor and are traditionally used in special dishes and desserts. Pine nuts are excellent for heart health and provide sustained energy.",
        image: "images/pine-nuts-100g.jpg",
        reviews: [
            { name: "Chef Rashid", rating: 5, comment: "Authentic chilgoza! Perfect for traditional Pakistani desserts." },
            { name: "Amna Hassan", rating: 5, comment: "Expensive but worth it. These are genuine pine nuts." },
            { name: "Farhan Ali", rating: 4, comment: "Good quality but very pricey. Special occasion treat." }
        ]
    },
    {
        name: "Dried Figs Anjeer - 500g",
        price: 1200,
        category: "dry-fruits",
        description: "Sweet, chewy dried figs packed with fiber, potassium, and calcium. These Mediterranean figs are naturally dried to preserve their nutritional value and sweet flavor. They're excellent for digestive health, bone strength, and provide natural energy. Perfect for breakfast, baking, or as a healthy dessert alternative. Our figs are sourced from the best orchards and are free from artificial preservatives.",
        image: "images/figs-500g.jpg",
        reviews: [
            { name: "Saima Khan", rating: 5, comment: "Delicious and healthy figs. Great for constipation relief." },
            { name: "Ahmed Ali", rating: 4, comment: "Good quality figs. Perfect sweetness level." },
            { name: "Noor Sheikh", rating: 5, comment: "My grandmother's favorite! Excellent quality and taste." }
        ]
    },
    {
        name: "Brazil Nuts - 250g",
        price: 1800,
        category: "dry-fruits",
        description: "Large, creamy Brazil nuts rich in selenium, healthy fats, and protein. These South American nuts are one of nature's richest sources of selenium, which supports immune function and thyroid health. They have a rich, buttery flavor and dense texture. Just 2-3 Brazil nuts provide the daily selenium requirement. Perfect for boosting immunity and supporting overall health.",
        image: "images/brazil-nuts-250g.jpg",
        reviews: [
            { name: "Dr. Amna Ali", rating: 5, comment: "Excellent source of selenium. I recommend these to my patients." },
            { name: "Usman Sheikh", rating: 4, comment: "Rich and creamy texture. Good for health." },
            { name: "Hina Khan", rating: 5, comment: "Great quality Brazil nuts. Perfect for thyroid health." }
        ]
    },
    {
        name: "Dried Apricots Khubani - 500g",
        price: 1000,
        category: "dry-fruits",
        description: "Sweet and tangy dried apricots from Hunza valley, known for their exceptional quality and taste. These apricots are rich in vitamin A, fiber, and potassium. They support eye health, boost immunity, and aid digestion. The natural sweetness makes them perfect for snacking or adding to trail mixes. Our Hunza apricots are sun-dried naturally without any artificial additives.",
        image: "images/apricots-500g.jpg",
        reviews: [
            { name: "Zara Hassan", rating: 5, comment: "Authentic Hunza apricots! Sweet and naturally dried." },
            { name: "Salman Ali", rating: 4, comment: "Good quality apricots. Perfect for healthy snacking." },
            { name: "Rabiya Sheikh", rating: 5, comment: "Best apricots in Pakistan. Highly nutritious!" }
        ]
    },
    {
        name: "Pecans - 250g",
        price: 2200,
        category: "dry-fruits",
        description: "Premium pecan halves with a rich, buttery flavor and tender texture. These American nuts are packed with healthy monounsaturated fats, protein, and antioxidants. Pecans are excellent for heart health, brain function, and provide sustained energy. Perfect for baking pies, making pralines, or enjoying as a gourmet snack. Our pecans are fresh and carefully selected for quality.",
        image: "images/pecans-250g.jpg",
        reviews: [
            { name: "Chef Maria", rating: 5, comment: "Perfect for baking! These pecans have amazing flavor." },
            { name: "Arslan Khan", rating: 4, comment: "Rich and creamy texture. Great for special recipes." },
            { name: "Sadia Ali", rating: 5, comment: "Premium quality pecans. Worth the price!" }
        ]
    },
    {
        name: "Hazelnuts - 300g",
        price: 1600,
        category: "dry-fruits",
        description: "Crunchy, flavorful hazelnuts with a sweet, nutty taste. These Turkish hazelnuts are rich in vitamin E, healthy fats, and fiber. They support heart health, improve brain function, and provide antioxidant protection. Perfect for making hazelnut spread, adding to chocolates, or enjoying as a healthy snack. Our hazelnuts are roasted to perfection to enhance their natural flavor.",
        image: "images/hazelnuts-300g.jpg",
        reviews: [
            { name: "Fatima Hassan", rating: 5, comment: "Love the crunch and flavor. Perfect for homemade Nutella!" },
            { name: "Omar Sheikh", rating: 4, comment: "Good quality hazelnuts. Great for baking." },
            { name: "Aiman Ali", rating: 5, comment: "Fresh and tasty hazelnuts. Highly recommended!" }
        ]
    },
    {
        name: "Macadamia Nuts - 200g",
        price: 2500,
        category: "dry-fruits",
        description: "Luxury macadamia nuts with an incredibly rich, buttery flavor and smooth texture. These Australian nuts are among the most premium nuts available, packed with healthy monounsaturated fats and protein. They're excellent for heart health and provide a satisfying, indulgent snacking experience. Perfect for special occasions or as a gourmet gift. Our macadamias are carefully selected for size and quality.",
        image: "images/macadamia-200g.jpg",
        reviews: [
            { name: "Irfan Hassan", rating: 5, comment: "Absolutely delicious! Best nuts I've ever tasted." },
            { name: "Laila Sheikh", rating: 5, comment: "Premium quality and worth every rupee. Luxury snacking!" },
            { name: "Tariq Ali", rating: 4, comment: "Expensive but incredibly tasty. Special treat." }
        ]
    },
    {
        name: "Dried Cranberries - 400g",
        price: 900,
        category: "dry-fruits",
        description: "Tart and sweet dried cranberries packed with antioxidants and vitamin C. These ruby-red berries support urinary tract health, boost immunity, and provide natural energy. Perfect for adding to salads, cereals, trail mixes, or baking. Our cranberries are naturally sweetened with apple juice and contain no artificial preservatives. They're chewy, flavorful, and nutritious.",
        image: "images/cranberries-400g.jpg",
        reviews: [
            { name: "Dr. Ayesha", rating: 5, comment: "Great for urinary health. I recommend these to patients." },
            { name: "Samra Khan", rating: 4, comment: "Perfect for my morning oatmeal. Good quality." },
            { name: "Fahad Sheikh", rating: 5, comment: "Tasty and healthy. Great antioxidant source!" }
        ]
    },
    // Continue with more dry fruits products...
    {
        name: "Pumpkin Seeds - 300g",
        price: 800,
        category: "dry-fruits",
        description: "Roasted and salted pumpkin seeds (pepitas) rich in zinc, magnesium, and healthy fats. These green seeds support prostate health, boost immunity, and provide sustained energy. Perfect for snacking, adding to salads, or using in baking. Our pumpkin seeds are carefully roasted to achieve the perfect crunch while preserving their nutritional value.",
        image: "images/pumpkin-seeds-300g.jpg",
        reviews: [
            { name: "Nasir Ali", rating: 5, comment: "Crunchy and healthy. Perfect snack for work." },
            { name: "Shazia Hassan", rating: 4, comment: "Good quality seeds. Great for zinc intake." },
            { name: "Majid Sheikh", rating: 5, comment: "Excellent taste and texture. Highly nutritious!" }
        ]
    },
    // Add more dry fruits to reach 50...

    // Herbal Tea (35 products)
    {
        name: "Green Tea Premium - 100g",
        price: 450,
        category: "herbal-tea",
        description: "Premium quality green tea leaves packed with antioxidants and natural compounds. This traditional tea supports weight management, boosts metabolism, and provides gentle energy without jitters. Rich in catechins and EGCG, it offers anti-inflammatory properties and supports heart health. Perfect for daily consumption and meditation. Our green tea is sourced from the finest tea gardens and processed to retain maximum nutrients.",
        image: "images/green-tea-100g.jpg",
        reviews: [
            { name: "Sarah Khan", rating: 5, comment: "Best green tea in Karachi! Perfect for my weight loss journey." },
            { name: "Hassan Ali", rating: 5, comment: "Excellent quality and taste. Very refreshing." },
            { name: "Amina Sheikh", rating: 4, comment: "Good tea but could be a bit stronger." }
        ]
    },
    {
        name: "Chamomile Tea - 50g",
        price: 350,
        category: "herbal-tea",
        description: "Pure dried chamomile flowers known for their calming and soothing properties. This gentle herbal tea promotes relaxation, improves sleep quality, and aids digestion. Chamomile has been used for centuries to reduce anxiety, inflammation, and support overall wellness. Perfect for evening consumption or whenever you need to unwind. Our chamomile is carefully dried to preserve its therapeutic compounds.",
        image: "images/chamomile-tea-50g.jpg",
        reviews: [
            { name: "Farah Hassan", rating: 5, comment: "Perfect for bedtime! Helps me sleep peacefully." },
            { name: "Usman Khan", rating: 5, comment: "Very calming and relaxing. Great quality chamomile." },
            { name: "Noor Ali", rating: 4, comment: "Good tea for stress relief. Mild and pleasant." }
        ]
    },
    {
        name: "Ginger Lemon Tea - 75g",
        price: 400,
        category: "herbal-tea",
        description: "Invigorating blend of dried ginger root and lemon peel, perfect for boosting immunity and aiding digestion. This warming tea helps fight cold symptoms, reduces nausea, and provides anti-inflammatory benefits. The combination of ginger's heat and lemon's vitamin C creates a powerful immune-boosting drink. Ideal for morning consumption or when feeling under the weather.",
        image: "images/ginger-lemon-tea-75g.jpg",
        reviews: [
            { name: "Ahmed Hassan", rating: 5, comment: "Perfect for winter! Boosts immunity and tastes great." },
            { name: "Zainab Sheikh", rating: 5, comment: "Excellent for digestion and cold relief. Highly recommended!" },
            { name: "Omar Ali", rating: 4, comment: "Good quality blend. Very warming and comforting." }
        ]
    },
    {
        name: "Mint Tea Pudina - 60g",
        price: 300,
        category: "herbal-tea",
        description: "Fresh dried mint leaves offering cooling and digestive properties. This refreshing herbal tea aids digestion, freshens breath, and provides a cooling effect. Rich in menthol, it helps with respiratory issues and provides natural relief from headaches. Perfect for after-meal consumption or hot summer days. Our mint leaves are hand-picked and carefully dried to preserve their essential oils.",
        image: "images/mint-tea-60g.jpg",
        reviews: [
            { name: "Sana Khan", rating: 5, comment: "Very refreshing! Perfect after heavy meals." },
            { name: "Imran Hassan", rating: 4, comment: "Good quality mint. Great for digestion." },
            { name: "Rabia Ali", rating: 5, comment: "Love the cooling effect. Perfect for summer!" }
        ]
    },
    {
        name: "Turmeric Tea Haldi - 80g",
        price: 500,
        category: "herbal-tea",
        description: "Golden turmeric root powder blended into a healing tea mix. This anti-inflammatory powerhouse supports joint health, boosts immunity, and provides antioxidant protection. Curcumin in turmeric offers natural pain relief and supports liver function. Perfect for those with inflammatory conditions or looking to boost overall health. Our turmeric is organic and contains added black pepper for better absorption.",
        image: "images/turmeric-tea-80g.jpg",
        reviews: [
            { name: "Dr. Fatima", rating: 5, comment: "Excellent anti-inflammatory tea. Great for joint pain." },
            { name: "Khalid Sheikh", rating: 5, comment: "Golden milk alternative. Very healing and tasty." },
            { name: "Ayesha Hassan", rating: 4, comment: "Good for immunity. Tastes earthy and warming." }
        ]
    },
    // Add more herbal teas to reach 35...

    // Honey (25 products)
    {
        name: "Pure Acacia Honey - 500g",
        price: 1200,
        category: "honey",
        description: "Premium pure acacia honey with a light, delicate flavor and crystal-clear appearance. This monofloral honey is known for its slow crystallization and mild taste, making it perfect for everyday use. Rich in antioxidants, enzymes, and minerals, it supports immunity, provides natural energy, and has antibacterial properties. Sourced directly from beekeepers using sustainable practices.",
        image: "images/acacia-honey-500g.jpg",
        reviews: [
            { name: "Mariam Khan", rating: 5, comment: "Pure and delicious! Best honey I've tasted." },
            { name: "Tariq Ali", rating: 5, comment: "Excellent quality and authentic taste. Highly recommended!" },
            { name: "Sadia Hassan", rating: 4, comment: "Good honey but could be more affordable." }
        ]
    },
    {
        name: "Sidr Honey - 250g",
        price: 2500,
        category: "honey",
        description: "Rare and precious Sidr honey from Yemen, considered one of the world's finest honeys. This dark, rich honey has a unique flavor with hints of butterscotch and offers exceptional medicinal properties. Known for its antibacterial, antifungal, and healing properties, Sidr honey is traditionally used for wound healing and digestive issues. This premium honey is harvested from Sidr trees in remote areas and is completely natural and unprocessed.",
        image: "images/sidr-honey-250g.jpg",
        reviews: [
            { name: "Dr. Ahmed", rating: 5, comment: "Authentic Sidr honey! Excellent for medicinal purposes." },
            { name: "Nadia Sheikh", rating: 5, comment: "Worth the price. Amazing healing properties." },
            { name: "Hassan Khan", rating: 4, comment: "Very rich and potent. A little goes a long way." }
        ]
    },
    {
        name: "Manuka Honey - 250g",
        price: 3500,
        category: "honey",
        description: "Premium New Zealand Manuka honey with verified MGO (Methylglyoxal) content for maximum therapeutic benefits. This antibacterial powerhouse supports immune function, wound healing, and digestive health. Manuka honey is scientifically proven to have superior antimicrobial properties compared to regular honey. Perfect for medicinal use, skincare, or as a premium sweetener.",
        image: "images/manuka-honey-250g.jpg",
        reviews: [
            { name: "Dr. Sarah", rating: 5, comment: "Genuine Manuka honey! Excellent for medical applications." },
            { name: "Farid Ali", rating: 5, comment: "Premium quality and authentic. Great for immunity." },
            { name: "Amna Hassan", rating: 4, comment: "Expensive but very effective for health issues." }
        ]
    },
    {
        name: "Forest Honey - 1KG",
        price: 1800,
        category: "honey",
        description: "Wild forest honey collected from diverse wildflowers in pristine forest areas. This multifloral honey has a rich, complex flavor profile and dark amber color. Packed with enzymes, antioxidants, and minerals from various plant sources, it offers superior nutritional benefits. The natural harvesting process ensures maximum retention of beneficial compounds. Perfect for those seeking raw, unprocessed honey.",
        image: "images/forest-honey-1kg.jpg",
        reviews: [
            { name: "Rashid Khan", rating: 5, comment: "Rich and flavorful! You can taste the wildflowers." },
            { name: "Zara Ali", rating: 5, comment: "Pure forest honey. Excellent for health and energy." },
            { name: "Bilal Sheikh", rating: 4, comment: "Good quality honey with unique forest taste." }
        ]
    },

    // Seeds (30 products)
    {
        name: "Chia Seeds - 500g",
        price: 1200,
        category: "seeds",
        description: "Nutrient-dense chia seeds packed with omega-3 fatty acids, fiber, and protein. These tiny superfoods support heart health, aid weight management, and provide sustained energy. When soaked, they form a gel-like consistency perfect for puddings and smoothies. Rich in calcium, magnesium, and antioxidants, chia seeds are excellent for bone health and reducing inflammation.",
        image: "images/chia-seeds-500g.jpg",
        reviews: [
            { name: "Nutritionist Ayesha", rating: 5, comment: "Best superfood! Perfect for weight loss and heart health." },
            { name: "Sameer Khan", rating: 5, comment: "High quality chia seeds. Great for smoothies." },
            { name: "Hira Ali", rating: 4, comment: "Good seeds but could expand better in water." }
        ]
    },
    {
        name: "Flax Seeds - 500g",
        price: 800,
        category: "seeds",
        description: "Golden flax seeds rich in omega-3 fatty acids, lignans, and dietary fiber. These seeds support heart health, hormone balance, and digestive wellness. They can be ground fresh or eaten whole, and are perfect for adding to cereals, smoothies, or baking. Flax seeds are particularly beneficial for women's hormonal health and provide anti-inflammatory benefits.",
        image: "images/flax-seeds-500g.jpg",
        reviews: [
            { name: "Dr. Fatima", rating: 5, comment: "Excellent for hormonal balance. Fresh and high quality." },
            { name: "Umar Hassan", rating: 4, comment: "Good quality flax seeds. Great for heart health." },
            { name: "Saba Sheikh", rating: 5, comment: "Perfect for my daily breakfast routine. Very nutritious!" }
        ]
    },
    {
        name: "Sunflower Seeds - 400g",
        price: 600,
        category: "seeds",
        description: "Roasted sunflower seeds rich in vitamin E, healthy fats, and protein. These crunchy seeds make a perfect snack and support skin health, immune function, and heart health. High in magnesium and selenium, they help reduce inflammation and support muscle function. Our sunflower seeds are lightly roasted and salted for optimal flavor and nutrition.",
        image: "images/sunflower-seeds-400g.jpg",
        reviews: [
            { name: "Ahmed Ali", rating: 5, comment: "Perfectly roasted and salted. Great healthy snack!" },
            { name: "Noor Hassan", rating: 4, comment: "Good quality seeds. Perfect crunch and taste." },
            { name: "Zainab Khan", rating: 5, comment: "My kids love these! Healthy alternative to chips." }
        ]
    },

    // Supplements (50 products)
    {
        name: "Vitamin D3 5000 IU - 60 Capsules",
        price: 1500,
        category: "supplements",
        description: "High-potency Vitamin D3 supplement essential for bone health, immune function, and calcium absorption. Each capsule provides 5000 IU of cholecalciferol, the most bioactive form of Vitamin D. Particularly important for people with limited sun exposure or those living in areas with minimal sunlight. Supports mood, muscle function, and overall wellness.",
        image: "images/vitamin-d3-60caps.jpg",
        reviews: [
            { name: "Dr. Hassan", rating: 5, comment: "Perfect dosage for D3 deficiency. High quality supplement." },
            { name: "Amna Ali", rating: 5, comment: "Helped improve my energy levels significantly!" },
            { name: "Tariq Sheikh", rating: 4, comment: "Good supplement but capsules are a bit large." }
        ]
    },
    {
        name: "Omega-3 Fish Oil - 90 Softgels",
        price: 2200,
        category: "supplements",
        description: "Premium omega-3 fish oil supplement with high EPA and DHA content for heart, brain, and joint health. Sourced from wild-caught fish and molecularly distilled for purity. Each softgel provides essential fatty acids that support cardiovascular function, reduce inflammation, and promote cognitive health. Third-party tested for mercury and other contaminants.",
        image: "images/omega3-90softgels.jpg",
        reviews: [
            { name: "Cardiologist Ali", rating: 5, comment: "Excellent quality fish oil. Great for heart patients." },
            { name: "Sana Khan", rating: 5, comment: "No fishy aftertaste. Perfect for daily use." },
            { name: "Imran Hassan", rating: 4, comment: "Good supplement but price could be better." }
        ]
    },

    // Capsules (40 products)
    {
        name: "Turmeric Curcumin Capsules - 60 Count",
        price: 1800,
        category: "capsules",
        description: "High-potency turmeric curcumin capsules with black pepper extract for maximum absorption. Each capsule contains 500mg of curcumin with 95% curcuminoids for powerful anti-inflammatory effects. Supports joint health, reduces inflammation, and provides antioxidant protection. Perfect for those with arthritis, inflammatory conditions, or looking to boost overall health.",
        image: "images/turmeric-capsules-60.jpg",
        reviews: [
            { name: "Arthritis Patient Saira", rating: 5, comment: "Significant reduction in joint pain! Highly effective." },
            { name: "Fitness Trainer Omar", rating: 5, comment: "Great for post-workout recovery. Reduces inflammation." },
            { name: "Senior Citizen Ahmad", rating: 4, comment: "Helpful for joint stiffness. Easy to swallow." }
        ]
    },

    // Cold Pressed Oil (30 products)
    {
        name: "Cold Pressed Coconut Oil - 500ml",
        price: 1200,
        category: "cold-pressed-oil",
        description: "Virgin cold-pressed coconut oil extracted without heat to preserve natural nutrients and flavor. Rich in medium-chain triglycerides (MCTs), this oil supports metabolism, brain health, and provides antimicrobial benefits. Perfect for cooking, skincare, hair care, and oil pulling. Our coconut oil is organic, unrefined, and maintains its natural coconut aroma.",
        image: "images/coconut-oil-500ml.jpg",
        reviews: [
            { name: "Beauty Expert Laila", rating: 5, comment: "Amazing for skin and hair! Pure and natural." },
            { name: "Chef Kareem", rating: 5, comment: "Perfect for high-heat cooking. Great coconut flavor." },
            { name: "Health Conscious Sara", rating: 4, comment: "Good quality oil but solidifies in winter." }
        ]
    },
    {
        name: "Cold Pressed Olive Oil - 500ml",
        price: 1800,
        category: "cold-pressed-oil",
        description: "Extra virgin cold-pressed olive oil from Mediterranean olives, rich in monounsaturated fats and antioxidants. This premium oil supports heart health, reduces inflammation, and provides vitamin E. Perfect for salad dressings, low-heat cooking, and Mediterranean cuisine. Our olive oil is first cold-pressed within hours of harvesting to ensure maximum nutrient retention.",
        image: "images/olive-oil-500ml.jpg",
        reviews: [
            { name: "Italian Chef Marco", rating: 5, comment: "Authentic taste and quality. Perfect for Mediterranean dishes." },
            { name: "Health Enthusiast Ayesha", rating: 5, comment: "Excellent for heart health. Great flavor profile." },
            { name: "Cooking Expert Hassan", rating: 4, comment: "Good quality but expensive compared to regular olive oil." }
        ]
    },

    // Essential Oils (35 products)
    {
        name: "Lavender Essential Oil - 15ml",
        price: 800,
        category: "essential-oils",
        description: "Pure lavender essential oil known for its calming and relaxing properties. This therapeutic-grade oil promotes better sleep, reduces anxiety, and provides natural stress relief. Perfect for aromatherapy, massage, or adding to bath water. Lavender oil also has antiseptic properties and can be used for minor skin irritations. Our lavender oil is steam-distilled from fresh flowers.",
        image: "images/lavender-oil-15ml.jpg",
        reviews: [
            { name: "Aromatherapist Nadia", rating: 5, comment: "Pure and potent lavender oil. Perfect for relaxation." },
            { name: "Insomniac Patient Ali", rating: 5, comment: "Helps me sleep much better. Very calming." },
            { name: "Spa Owner Fatima", rating: 4, comment: "Good quality but could be more concentrated." }
        ]
    },
    {
        name: "Tea Tree Essential Oil - 15ml",
        price: 900,
        category: "essential-oils",
        description: "Antibacterial tea tree essential oil from Australian Melaleuca trees. This powerful oil has antimicrobial, antifungal, and anti-inflammatory properties. Perfect for treating acne, fungal infections, and as a natural disinfectant. Can be diluted for topical use or added to cleaning products. Our tea tree oil is 100% pure and steam-distilled for maximum potency.",
        image: "images/tea-tree-oil-15ml.jpg",
        reviews: [
            { name: "Dermatologist Dr. Samina", rating: 5, comment: "Excellent for acne treatment. Pure and effective." },
            { name: "Natural Health Advocate Usman", rating: 5, comment: "Great natural antiseptic. Multiple uses!" },
            { name: "Teenage Daughter Maryam", rating: 4, comment: "Helped clear my acne but smell is strong." }
        ]
    },

    // Deals (35 products with discounted prices)
    {
        name: "Family Pack Mixed Nuts - 2KG",
        price: 4500,
        originalPrice: 5500,
        category: "deals",
        description: "Special family pack containing 2KG of premium mixed nuts including almonds, cashews, walnuts, pistachios, and dates. Perfect for large families or gifting during festivals. This bulk pack offers significant savings while providing variety and nutrition for everyone. Each nut is hand-selected for quality and freshness. Great value for health-conscious families.",
        image: "images/family-pack-nuts-2kg.jpg",
        reviews: [
            { name: "Large Family Mom Rabia", rating: 5, comment: "Perfect quantity for our family. Great savings!" },
            { name: "Bulk Buyer Hassan", rating: 5, comment: "Excellent value for money. Fresh and tasty!" },
            { name: "Festival Shopper Aisha", rating: 4, comment: "Good deal but packaging could be better." }
        ]
    }
];

// --- APPOINTMENT TOOLTIP FUNCTIONS ---
function showAppointmentTooltip() {
    if (!tooltipShown && elements.appointmentTooltip) {
        elements.appointmentTooltip.classList.add('show');
        tooltipShown = true;
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            if (elements.appointmentTooltip.classList.contains('show')) {
                closeAppointmentTooltip();
            }
        }, 8000);
    }
}

window.closeAppointmentTooltip = function() {
    if (elements.appointmentTooltip) {
        elements.appointmentTooltip.classList.remove('show');
        // Mark as permanently dismissed
        localStorage.setItem('appointmentTooltipDismissed', 'true');
    }
}

// Check if tooltip should be shown on page load
function checkAppointmentTooltip() {
    const dismissed = localStorage.getItem('appointmentTooltipDismissed');
    if (!dismissed) {
        // Show tooltip after 3 seconds on page load
        setTimeout(() => {
            showAppointmentTooltip();
        }, 3000);
    }
}

// --- MOBILE FUNCTIONALITY ---
// Mobile header scroll behavior with requestAnimationFrame for better performance
function handleScroll() {
    if (window.innerWidth <= 768) {
        requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                elements.mainHeader.classList.add('hidden-mobile');
            } else {
                elements.mainHeader.classList.remove('hidden-mobile');
            }
            lastScrollY = currentScrollY;
        });
    }
}

// Mobile search functions
window.openMobileSearch = function () {
    elements.mobileSearchOverlay.style.display = 'block';
    elements.mobileSearchInputEl.focus();
}

window.closeMobileSearch = function () {
    elements.mobileSearchOverlay.style.display = 'none';
    elements.mobileSearchInputEl.value = '';
    document.getElementById('mobile-search-results-grid').innerHTML = '';
}

// Mobile menu functions
window.openMobileMenu = function () {
    elements.mobileMenuOverlay.style.display = 'block';
    setTimeout(() => {
        elements.mobileMenuSidebar.classList.add('open');
    }, 10);
}

window.closeMobileMenu = function () {
    elements.mobileMenuSidebar.classList.remove('open');
    setTimeout(() => {
        elements.mobileMenuOverlay.style.display = 'none';
    }, 300);
}

// Optimized mobile search with debouncing
const handleMobileSearch = debounce(() => {
    const query = elements.mobileSearchInputEl.value.toLowerCase().trim();
    const resultsGrid = document.getElementById('mobile-search-results-grid');

    if (query.length === 0) {
        resultsGrid.innerHTML = '';
        return;
    }

    const results = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );

    renderProducts(results, 'mobile-search-results-grid');
}, 300);

// --- APPOINTMENT FUNCTIONS ---
// Set minimum date to tomorrow
function setMinimumAppointmentDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    document.getElementById('appointment-date').setAttribute('min', minDate);
}

// Render appointments in admin panel
function renderAppointments(appointments) {
    if (!elements.appointmentsListEl) return;
    
    if (appointments.length === 0) {
        elements.appointmentsListEl.innerHTML = '<p>No appointments booked yet.</p>';
        return;
    }

    // Sort appointments by date and time
    appointments.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });

    const fragment = createDocumentFragment();
    appointments.forEach(appointment => {
        const appointmentElement = document.createElement('div');
        appointmentElement.className = 'appointment-record';
        
        const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const status = appointment.status || 'pending';

        appointmentElement.innerHTML = `
            <h4>Appointment with: ${appointment.name}</h4>
            <p><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</p>
            <p><strong>Phone:</strong> ${appointment.phone}</p>
            ${appointment.email ? `<p><strong>Email:</strong> ${appointment.email}</p>` : ''}
            ${appointment.concern ? `<p><strong>Health Concern:</strong> ${appointment.concern}</p>` : ''}
            <p><strong>Booking ID:</strong> ${appointment.id}</p>
            <p><strong>Booked on:</strong> ${new Date(appointment.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="appointment-status ${status}">${status}</span></p>
            <button 
                class="btn-fulfillment ${status === 'completed' ? 'fulfilled' : ''}" 
                data-appointment-id="${appointment.id}" 
                data-current-status="${status}"
                ${status === 'completed' ? 'disabled' : ''}>
                ${status === 'pending' ? 'Mark as Confirmed' : 
                  status === 'confirmed' ? 'Mark as Completed' : 
                  'Completed'}
            </button>
        `;
        
        fragment.appendChild(appointmentElement);
    });
    
    elements.appointmentsListEl.innerHTML = '';
    elements.appointmentsListEl.appendChild(fragment);
}

// --- OPTIMIZED RENDER FUNCTIONS ---
function renderAllGrids() {
    // Use requestIdleCallback for non-critical rendering
    const grids = [
        { products: allProducts, id: 'all-products-grid' },
        { products: allProducts.filter(p => p.category === 'dry-fruits'), id: 'dry-fruits-grid' },
        { products: allProducts.filter(p => p.category === 'herbal-tea'), id: 'herbal-tea-grid' },
        { products: allProducts.filter(p => p.category === 'honey'), id: 'honey-grid' },
        { products: allProducts.filter(p => p.category === 'seeds'), id: 'seeds-grid' },
        { products: allProducts.filter(p => p.category === 'supplements'), id: 'supplements-grid' },
        { products: allProducts.filter(p => p.category === 'capsules'), id: 'capsules-grid' },
        { products: allProducts.filter(p => p.category === 'cold-pressed-oil'), id: 'cold-pressed-oil-grid' },
        { products: allProducts.filter(p => p.category === 'essential-oils'), id: 'essential-oils-grid' },
        { products: allProducts.filter(p => p.category === 'deals'), id: 'deals-grid' }
    ];

    // Render critical grids first
    renderProducts(grids[0].products, grids[0].id);

    // Use requestIdleCallback for other grids
    if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
            grids.slice(1).forEach(grid => {
                renderProducts(grid.products, grid.id);
            });
        });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
            grids.slice(1).forEach(grid => {
                renderProducts(grid.products, grid.id);
            });
        }, 0);
    }
}

function renderProducts(productsToRender, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (productsToRender.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 20px 0;">No products found in this category.</p>';
        return;
    }

    const fragment = createDocumentFragment();
    
    productsToRender.forEach(p => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image" onclick="showProductPage('${p.id}')">
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/300x300/ccc/ffffff?text=Image+Not+Found';">
            </div>
            <div class="product-info">
                <h3 onclick="showProductPage('${p.id}')">${p.name}</h3>
                <div class="product-price">
                    ${p.originalPrice ? `<span class="price-original">Rs.${p.originalPrice.toFixed(2)}</span>` : ''}
                    Rs.${p.price.toFixed(2)}
                </div>
                <div class="quantity-controls" data-product-id="${p.id}">
                    <button class="quantity-btn">-</button>
                    <input type="number" class="quantity-input" value="1" min="1">
                    <button class="quantity-btn">+</button>
                </div>
                <button class="btn-primary add-to-cart-btn" data-product-id="${p.id}">ADD TO CART</button>
            </div>
        `;
        fragment.appendChild(productCard);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderProductDetailPage(product) {
    if (!product) {
        elements.productDetailContentEl.innerHTML = '<p>Product not found.</p>';
        return;
    }

    // Render reviews
    const reviewsHtml = product.reviews && product.reviews.length > 0 
        ? product.reviews.map(review => `
            <div class="product-review">
                <div class="review-header">
                    <strong>${review.name}</strong>
                    <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                </div>
                <p class="review-comment">"${review.comment}"</p>
            </div>
        `).join('')
        : '<p>No reviews yet.</p>';
    
    elements.productDetailContentEl.innerHTML = `
        <a href="#" onclick="showPage(lastViewedCategory)" class="back-link">&larr; Back to products</a>
        <div class="product-detail-container">
            <div class="product-detail-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x400/ccc/ffffff?text=Image+Not+Found';">
            </div>
            <div class="product-detail-info">
                <h1>${product.name}</h1>
                <div class="product-price">
                    ${product.originalPrice ? `<span class="price-original">Rs.${product.originalPrice.toFixed(2)}</span>` : ''}
                    Rs.${product.price.toFixed(2)}
                </div>
                <p>${product.description || 'No description available.'}</p>
                <div class="quantity-controls" data-product-id="${product.id}">
                    <button class="quantity-btn">-</button>
                    <input type="number" class="quantity-input" value="1" min="1">
                    <button class="quantity-btn">+</button>
                </div>
                <button class="btn-primary add-to-cart-btn" data-product-id="${product.id}" style="margin-top: 20px; width: auto;">ADD TO CART</button>
                
                <div class="product-reviews-section" style="margin-top: 40px;">
                    <h3>Customer Reviews</h3>
                    <div class="product-reviews">
                        ${reviewsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render admin products list for management
function renderAdminProductsList() {
    const adminProductsListEl = document.getElementById('admin-products-list');
    if (!adminProductsListEl) return;

    if (allProducts.length === 0) {
        adminProductsListEl.innerHTML = '<p>No products found.</p>';
        return;
    }

    const fragment = createDocumentFragment();
    allProducts.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'admin-product-item';
        productItem.innerHTML = `
            <div class="admin-product-info">
                <h4>${product.name}</h4>
                <p>Price: Rs.${product.price.toFixed(2)} | Category: ${product.category}</p>
                <p>ID: ${product.id}</p>
            </div>
            <div class="admin-product-actions">
                <button class="btn-update-image" onclick="openImageUpdateModal('${product.id}')">Update Image</button>
                <button class="btn-delete" onclick="deleteProduct('${product.id}')">Delete</button>
            </div>
        `;
        fragment.appendChild(productItem);
    });
    
    adminProductsListEl.innerHTML = '';
    adminProductsListEl.appendChild(fragment);
}

// --- IMAGE UPDATE FUNCTIONALITY ---
elements.imageUpdateForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentProductForImageUpdate) return;
    
    const newImageFilename = document.getElementById('update-image-filename').value.trim();
    if (!newImageFilename) {
        showAlert("Please enter a valid image filename.");
        return;
    }
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';
    
    try {
        const newImageUrl = `images/${newImageFilename}`;
        const productRef = doc(db, "products", currentProductForImageUpdate);
        
        await updateDoc(productRef, {
            image: newImageUrl
        });
        
        // Update local product data
        const productIndex = allProducts.findIndex(p => p.id === currentProductForImageUpdate);
        if (productIndex !== -1) {
            allProducts[productIndex].image = newImageUrl;
        }
        
        // Re-render all grids and admin list
        renderAllGrids();
        renderAdminProductsList();
        
        showAlert("Product image updated successfully!");
        closeImageUpdateModal();
        
    } catch (error) {
        console.error("Error updating product image: ", error);
        showAlert(`Failed to update product image. Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Image';
    }
});

// --- PAGE NAVIGATION ---
window.showPage = function (pageId) {
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
        elements.pages.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId + '-page');
        if (targetPage) {
            targetPage.classList.remove('hidden');
            if (!['cart', 'checkout', 'product-detail', 'order-success', 'login', 'admin', 'search-results', 'appointment'].includes(pageId)) {
                lastViewedCategory = pageId;
            }
        }
        window.scrollTo(0, 0);

        if (pageId === 'checkout') renderCheckoutPage();
        if (pageId === 'admin') renderAdminPanel();
        if (pageId === 'appointment') setMinimumAppointmentDate();

        // Close mobile overlays when navigating
        closeMobileSearch();
        closeMobileMenu();
        
        // Hide appointment tooltip when navigating to appointment page
        if (pageId === 'appointment') {
            closeAppointmentTooltip();
        }
    });
}

window.showProductPage = function (productId) {
    const product = allProducts.find(p => p.id === productId);
    renderProductDetailPage(product);
    showPage('product-detail');
}

// --- SLIDER LOGIC ---
// Desktop Slider
window.plusSlides = function (n) {
    showSlides(desktopSlideIndex += n);
    resetDesktopSlideInterval();
}

window.currentSlideDot = function (n) {
    showSlides(desktopSlideIndex = n);
    resetDesktopSlideInterval();
}

function showSlides(n) {
    const sliderEl = document.getElementById('desktop-slider');
    if (!sliderEl) return;

    const slides = sliderEl.getElementsByClassName("slide");
    const dots = sliderEl.getElementsByClassName("dot");
    if (slides.length === 0) return;

    if (n > slides.length) { desktopSlideIndex = 1 }
    if (n < 1) { desktopSlideIndex = slides.length }

    // Use forEach for better performance
    Array.from(slides).forEach(slide => slide.style.display = "none");
    Array.from(dots).forEach(dot => dot.classList.remove("active-dot"));
    
    slides[desktopSlideIndex - 1].style.display = "block";
    dots[desktopSlideIndex - 1].classList.add("active-dot");
}

function resetDesktopSlideInterval() {
    clearInterval(desktopSlideInterval);
    desktopSlideInterval = setInterval(() => plusSlides(1), 5000);
}

// Mobile Slider (Auto-rotating)
function rotateMobileSlides() {
    const sliderEl = document.getElementById('mobile-slider');
    if (!sliderEl) return;
    const slides = sliderEl.getElementsByClassName("slide");
    if (slides.length === 0) return;

    Array.from(slides).forEach(slide => slide.style.display = "none");
    mobileSlideIndex++;
    if (mobileSlideIndex > slides.length) { mobileSlideIndex = 1 }
    slides[mobileSlideIndex - 1].style.display = "block";
}

// --- CART LOGIC ---
function addToCart(productId, quantity) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity: quantity });
    }
    updateCartDisplay();
    showAlert(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
}

function updateCartDisplay() {
    renderCartPage();
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    elements.cartTotalHeaderEl.textContent = total.toFixed(2);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartItemCountBadgeEl.textContent = totalItems;
}

function renderCartPage() {
    if (!elements.cartViewContainerEl) return;
    
    if (cart.length === 0) {
        elements.cartViewContainerEl.innerHTML = '<p class="cart-empty-message">Your cart is currently empty.</p>';
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemsHtml = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-details">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/60x60/ccc/ffffff?text=N/A';">
                </div>
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p class="cart-item-price">Rs.${item.price.toFixed(2)} x ${item.quantity}</p>
                </div>
            </div>
            <div class="cart-item-actions">
                <strong>Rs.${(item.price * item.quantity).toFixed(2)}</strong>
                <button class="remove-from-cart-btn" data-product-id="${item.id}">Remove</button>
            </div>
        </div>
    `).join('');
    
    elements.cartViewContainerEl.innerHTML = `
        <div class="cart-container">
            <div class="cart-items">${cartItemsHtml}</div>
            <div class="cart-summary">
                <h3>Order Summary</h3>
                <p><span>Subtotal</span> <span>Rs.${total.toFixed(2)}</span></p>
                <p><span>Shipping</span> <span>${total >= 2000 ? 'Free' : 'Rs.200'}</span></p>
                <hr>
                <p class="total"><span>Total</span> <span>Rs.${(total + (total < 2000 ? 200 : 0)).toFixed(2)}</span></p>
                <button class="btn-primary" onclick="showPage('checkout')">Proceed to Checkout</button>
            </div>
        </div>
    `;
}

// --- CHECKOUT LOGIC ---
function renderCheckoutPage() {
    const guestEmailGroup = document.getElementById('guest-email-group');
    const emailInput = document.getElementById('email');

    if (!currentUser) {
        guestEmailGroup.classList.remove('hidden');
        emailInput.required = true;
    } else {
        guestEmailGroup.classList.add('hidden');
        emailInput.required = false;
    }

    const summaryContainer = document.getElementById('checkout-summary-container');
    if (!summaryContainer) return;
    
    if (cart.length === 0) {
        showAlert("Your cart is empty. Add items before checking out.");
        showPage('cart');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 2000 ? 0 : 200;
    const total = subtotal + shipping;
    
    const summaryItemsHtml = cart.map(item => `
        <div class="summary-item">
            <span>${item.name} (x${item.quantity})</span>
            <span>Rs.${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    summaryContainer.innerHTML = `
        ${summaryItemsHtml}
        <div class="summary-item" style="margin-top: 10px;">
            <span>Subtotal</span>
            <span>Rs.${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span>Shipping</span>
            <span>Rs.${shipping.toFixed(2)}</span>
        </div>
        <div class="summary-total">
            <span>Total</span>
            <span>Rs.${total.toFixed(2)}</span>
        </div>
    `;
}

window.showPaymentContent = function (method) {
    document.querySelectorAll('.payment-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${method}-content`).classList.remove('hidden');
    document.querySelectorAll('.payment-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`.payment-tab[onclick="showPaymentContent('${method}')"]`).classList.add('active');
}

// --- PRODUCT MANAGEMENT ---
window.deleteProduct = async function (productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, "products", productId));
        allProducts = allProducts.filter(p => p.id !== productId);
        renderAllGrids();
        renderAdminProductsList();
        showAlert("Product deleted successfully!");
    } catch (error) {
        console.error("Error deleting product: ", error);
        showAlert("Failed to delete product. Please try again.");
    }
}

// --- AUTHENTICATION & ADMIN (LOCAL STORAGE) ---
window.toggleAuthForms = function () {
    elements.loginFormEl.classList.toggle('hidden');
    elements.signupFormEl.classList.toggle('hidden');
    elements.loginFormEl.reset();
    elements.signupFormEl.reset();
}

function updateAuthControls() {
    if (currentUser) {
        let welcomeMessage = `Welcome, ${currentUser.name}`;
        if (currentUser.role === 'admin') {
            welcomeMessage += ` | <a href="#" onclick="showPage('admin')">Admin Panel</a>`;
        }
        welcomeMessage += ` | <a href="#" onclick="logout()">Logout</a>`;
        elements.authControlsEl.innerHTML = welcomeMessage;
    } else {
        elements.authControlsEl.innerHTML = `<a href="#" onclick="showPage('login')">Login</a>`;
    }
}

window.logout = function () {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthControls();
    showPage('home');
    showAlert("You have been logged out.");
}

function renderAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') {
        showAlert("You do not have permission to view this page.");
        showPage('home');
        return;
    }
    
    // Firestore listener for orders
    const ordersQuery = query(collection(db, "orders"));
    onSnapshot(ordersQuery, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        renderOrders(orders);
    });

    // Firestore listener for appointments
    const appointmentsQuery = query(collection(db, "appointments"));
    onSnapshot(appointmentsQuery, (querySnapshot) => {
        const appointments = [];
        querySnapshot.forEach((doc) => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        renderAppointments(appointments);
    });

    // Render products list for management
    renderAdminProductsList();
}

window.showAdminContent = function (contentType) {
    document.querySelectorAll('.admin-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`admin-${contentType}-content`).classList.remove('hidden');
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    document.querySelector(`.admin-tab[onclick="showAdminContent('${contentType}')"]`).classList.add('active');

    if (contentType === 'manage') {
        renderAdminProductsList();
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        elements.ordersListEl.innerHTML = '<p>No orders received yet.</p>';
        return;
    }
    
    // Sort orders by date, newest first
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    const fragment = createDocumentFragment();
    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-record';
        
        const isFulfilled = order.status === 'fulfilled';
        let orderItemsHtml = '';
        if (order.items && Array.isArray(order.items)) {
            orderItemsHtml = order.items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('');
        }

        orderElement.innerHTML = `
            <h4>Order from: ${order.customer.name}</h4>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${new Date(order.date).toLocaleString()}</p>
            <p><strong>Contact:</strong> ${order.customer.email} | ${order.customer.phone}</p>
            <p><strong>Address:</strong> ${order.customer.address}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Total:</strong> Rs. ${order.total.toFixed(2)}</p>
            <details>
                <summary>View Items (${order.items.length})</summary>
                <ul>${orderItemsHtml}</ul>
            </details>
            <button 
                class="btn-fulfillment ${isFulfilled ? 'fulfilled' : ''}" 
                data-order-id="${order.id}" 
                ${isFulfilled ? 'disabled' : ''}>
                ${isFulfilled ? 'Fulfilled' : 'Mark as Fulfilled'}
            </button>
        `;
        
        fragment.appendChild(orderElement);
    });
    
    elements.ordersListEl.innerHTML = '';
    elements.ordersListEl.appendChild(fragment);
}

// --- MODAL & SEARCH ---
function showAlert(message) {
    elements.modalMessageEl.textContent = message;
    elements.modalEl.classList.remove('hidden');
}

// Debounced search function for better performance
const handleSearch = debounce(() => {
    const query = elements.searchInputEl.value.toLowerCase().trim();
    if (query.length === 0) {
        showPage(lastViewedCategory || 'home');
        return;
    }
    
    const results = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
    );
    
    renderProducts(results, 'search-results-grid');
    showPage('search-results');
    document.getElementById('search-results-title').textContent = `Results for "${query}"`;
}, 300);

// --- OPTIMIZED EVENT LISTENERS ---
// Use event delegation for better performance
document.addEventListener('click', async function (e) {
    // Handle add to cart buttons
    if (e.target.classList.contains('add-to-cart-btn')) {
        const productId = e.target.dataset.productId;
        const controls = e.target.closest('.product-info, .product-detail-info');
        const quantity = parseInt(controls.querySelector('.quantity-input').value);
        addToCart(productId, quantity);
    }
    
    // Handle quantity buttons
    if (e.target.classList.contains('quantity-btn')) {
        const input = e.target.parentNode.querySelector('.quantity-input');
        let value = parseInt(input.value);
        if (e.target.textContent === '+') value++;
        else if (value > 1) value--;
        input.value = value;
    }
    
    // Handle remove from cart buttons
    if (e.target.classList.contains('remove-from-cart-btn')) {
        const productId = e.target.dataset.productId;
        removeFromCart(productId);
    }
    
    // Order fulfillment button listener
    if (e.target.classList.contains('btn-fulfillment') && !e.target.disabled && e.target.dataset.orderId) {
        const orderId = e.target.dataset.orderId;
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, { status: "fulfilled" });
            showAlert(`Order ${orderId} marked as fulfilled.`);
        } catch (error) {
            console.error("Error updating order status: ", error);
            showAlert("Failed to update order status.");
        }
    }
    
    // Appointment status button listener
    if (e.target.classList.contains('btn-fulfillment') && !e.target.disabled && e.target.dataset.appointmentId) {
        const appointmentId = e.target.dataset.appointmentId;
        const currentStatus = e.target.dataset.currentStatus;
        let newStatus;
        
        if (currentStatus === 'pending') {
            newStatus = 'confirmed';
        } else if (currentStatus === 'confirmed') {
            newStatus = 'completed';
        } else {
            return; // Already completed
        }

        const appointmentRef = doc(db, "appointments", appointmentId);
        try {
            await updateDoc(appointmentRef, { status: newStatus });
            showAlert(`Appointment ${appointmentId} marked as ${newStatus}.`);
        } catch (error) {
            console.error("Error updating appointment status: ", error);
            showAlert("Failed to update appointment status.");
        }
    }
});

// Close mobile overlays when clicking outside
elements.mobileSearchOverlay.addEventListener('click', (e) => {
    if (e.target === elements.mobileSearchOverlay) {
        closeMobileSearch();
    }
});

elements.mobileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === elements.mobileMenuOverlay) {
        closeMobileMenu();
    }
});

// Close image update modal when clicking outside
elements.imageUpdateModal.addEventListener('click', (e) => {
    if (e.target === elements.imageUpdateModal) {
        closeImageUpdateModal();
    }
});

// Modal event listeners
elements.modalCloseBtn.addEventListener('click', () => elements.modalEl.classList.add('hidden'));
elements.modalEl.addEventListener('click', (e) => { 
    if (e.target === elements.modalEl) elements.modalEl.classList.add('hidden'); 
});

// Search event listeners with debouncing
elements.searchInputEl.addEventListener('input', handleSearch);
elements.mobileSearchInputEl.addEventListener('input', handleMobileSearch);

// Add scroll listener for mobile header with throttling
let ticking = false;
function throttledScrollHandler() {
    if (!ticking) {
        requestAnimationFrame(() => {
            handleScroll();
            ticking = false;
        });
        ticking = true;
    }
}
window.addEventListener('scroll', throttledScrollHandler, { passive: true });

// Handle window resize
window.addEventListener('resize', debounce(() => {
    if (window.innerWidth > 768) {
        elements.mainHeader.classList.remove('hidden-mobile');
        closeMobileSearch();
        closeMobileMenu();
    }
}, 250));

// Form event listeners
elements.loginFormEl.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (email === 'admin@gmail.com' && password === 'admin123') {
        currentUser = { name: 'Admin', email: 'admin@gmail.com', role: 'admin' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthControls();
        showPage('admin');
        elements.loginFormEl.reset();
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthControls();
        showPage('home');
        elements.loginFormEl.reset();
    } else {
        showAlert("Invalid email or password.");
    }
});

elements.signupFormEl.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    let users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.some(u => u.email === email)) {
        showAlert("An account with this email already exists.");
        return;
    }
    
    const newUser = { name, email, password, role: 'customer' };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    showAlert("Signup successful! Please login.");
    toggleAuthForms();
});

// Appointment form submission
elements.appointmentFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('appointment-name').value,
        phone: document.getElementById('appointment-phone').value,
        email: document.getElementById('appointment-email').value,
        date: document.getElementById('appointment-date').value,
        time: document.getElementById('appointment-time').value,
        concern: document.getElementById('appointment-concern').value,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    // Validate date is not in the past
    const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (appointmentDateTime <= now) {
        showAlert("Please select a future date and time for your appointment.");
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "appointments"), formData);
        showAlert(`Appointment booked successfully! Your booking reference is: ${docRef.id.substring(0, 8).toUpperCase()}`);
        elements.appointmentFormEl.reset();
        setMinimumAppointmentDate(); // Reset minimum date
        showPage('home');
    } catch (error) {
        console.error("Error booking appointment: ", error);
        showAlert("Failed to book appointment. Please try again.");
    }
});

elements.checkoutFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 2000 ? 0 : 200;
    const total = subtotal + shipping;

    const newOrder = {
        date: new Date().toISOString(),
        customer: {
            name: document.getElementById('fullName').value,
            email: currentUser ? currentUser.email : document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
        },
        items: cart,
        paymentMethod: document.querySelector('.payment-tab.active').textContent,
        total: total,
        status: 'pending'
    };

    try {
        const docRef = await addDoc(collection(db, "orders"), newOrder);
        console.log("Order written with ID: ", docRef.id);
        showPage('order-success');
        cart = [];
        updateCartDisplay();
        elements.checkoutFormEl.reset();
    } catch (error) {
        console.error("Error adding order to Firestore: ", error);
        showAlert('There was a problem placing your order. Please try again.');
    }
});

elements.addProductFormEl.addEventListener('submit', async function (e) {
    e.preventDefault();
    const submitButton = elements.addProductFormEl.querySelector('button[type="submit"]');

    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const category = document.getElementById('product-category').value;
    const description = document.getElementById('product-description').value;
    const imageFilename = document.getElementById('product-image-filename').value;

    if (!imageFilename) {
        showAlert("Please enter the image filename.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    try {
        const imageUrl = `images/${imageFilename}`;
        const newProduct = {
            id: String(Date.now()),
            name,
            price,
            category,
            description,
            image: imageUrl,
            reviews: [] // Initialize with empty reviews array
        };

        await setDoc(doc(db, "products", newProduct.id), newProduct);

        showAlert("Product added successfully!");
        allProducts.push(newProduct);
        renderAllGrids();
        renderAdminProductsList();
        elements.addProductFormEl.reset();
    } catch (error) {
        console.error("Error adding product: ", error);
        showAlert(`Failed to add product. Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Product';
    }
});

// --- INITIALIZATION ---
async function initializeStore() {
    // Load user from local storage
    try {
        const loggedInUser = JSON.parse(localStorage.getItem('currentUser'));
        if (loggedInUser) {
            currentUser = loggedInUser;
        }
    } catch (error) {
        console.error("Could not parse user from local storage:", error);
        localStorage.removeItem('currentUser');
    }
    updateAuthControls();

    // Check if products exist in Firebase, if not, seed them
    try {
        const productsCollection = collection(db, "products");
        const productSnapshot = await getDocs(productsCollection);

        if (productSnapshot.empty) {
            console.log("No products found in Firestore. Seeding with initial products...");
            
            // Seed products to Firebase
            const seedPromises = productsData.map(async (product) => {
                const productWithId = {
                    ...product,
                    id: String(Date.now() + Math.random() * 1000) // Generate unique ID
                };
                await setDoc(doc(db, "products", productWithId.id), productWithId);
                return productWithId;
            });
            
            allProducts = await Promise.all(seedPromises);
            console.log(`Seeded ${allProducts.length} products to Firestore.`);
        } else {
            allProducts = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        renderAllGrids();
    } catch (error) {
        console.error("Error with Firestore products: ", error);
        // Fallback to local products if Firebase fails
        allProducts = productsData.map(product => ({
            ...product,
            id: String(Date.now() + Math.random() * 1000)
        }));
        renderAllGrids();
    }

    // Initial UI setup
    updateCartDisplay();
    
    // Start Desktop Slider
    showSlides(desktopSlideIndex);
    resetDesktopSlideInterval();
    
    // Start Mobile Slider
    rotateMobileSlides();
    setInterval(rotateMobileSlides, 5000);
    
    // Check and show appointment tooltip
    checkAppointmentTooltip();
}

// Run the store on DOMContentLoaded for better performance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStore);
} else {
    initializeStore();
}