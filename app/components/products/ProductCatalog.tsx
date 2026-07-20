'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone,
  Laptop,
  Shirt,
  Sparkles,
  Bed,
  Activity,
  Home as HomeIcon,
  Check, 
  LogOut, 
  Loader2,
  ShoppingCart,
  Package,
  ClipboardList,
  User,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getProducts, 
  getProductsPaginated,
  createOrder, 
  getProfileFields, 
  completeUserProfileRegistration, 
  Product, 
  OrderItem, 
  ProfileField,
  getOrders,
  updateOrder,
  deleteOrder,
  Order,
  getGlobalSettings,
  GlobalSettings
} from '../../lib/db';
import { getTranslation, LangType } from '../../lib/translations';
import ConfirmModal from '../ui/ConfirmModal';

// Organisms
import ClientProductGrid from '../organisms/ClientProductGrid';
import ClientProfileTab from '../organisms/ClientProfileTab';
import OrderSuccessModal from '../organisms/OrderSuccessModal';
import ClientOrdersList from '../organisms/ClientOrdersList';

// 21 Retail E-commerce products matching Amazon/Flipkart
export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'retail-1',
    nameEn: 'iPhone 15 Pro (128GB)',
    nameHi: 'आईफोन 15 प्रो (128GB)',
    descEn: 'Super Retina XDR display, advanced pro camera system, and dynamic island.',
    descHi: 'सुपर रेटिना एक्सडीआर डिस्प्ले, उन्नत प्रो कैमरा सिस्टम और डायनेमिक आइलैंड।',
    price: 129999,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto-format&fit=crop&q=60',
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-2',
    nameEn: 'MacBook Air M3 Laptop',
    nameHi: 'मैकबुक एयर M3 लैपटॉप',
    descEn: 'Supercharged by Apple M3 chip, thin and light aluminum body, all-day battery life.',
    descHi: 'ऐप्पल M3 चिप द्वारा संचालित, पतला और हल्का एल्यूमीनियम बॉडी, पूरे दिन की बैटरी लाइफ।',
    price: 114900,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto-format&fit=crop&q=60',
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-3',
    nameEn: 'Sony WH-1000XM4 Headphones',
    nameHi: 'सोनी WH-1000XM4 हेडफ़ोन',
    descEn: 'Industry-leading noise cancellation, long battery life, and crystal-clear sound.',
    descHi: 'उद्योग का अग्रणी शोर रद्दीकरण, लंबी बैटरी लाइफ और बेहतरीन आवाज़।',
    price: 19990,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto-format&fit=crop&q=60',
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-4',
    nameEn: 'Apple Watch Series 9',
    nameHi: 'ऐप्पल वॉच सीरीज़ 9',
    descEn: 'Advanced health sensors, bright Always-On display, and touch-free double tap gesture.',
    descHi: 'उन्नत स्वास्थ्य सेंसर, चमकदार ऑलवेज-ऑन डिस्प्ले और टच-फ्री डबल टैप जेस्चर।',
    price: 41900,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=500&auto-format&fit=crop&q=60',
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-5',
    nameEn: 'Nike Air Max Sneakers',
    nameHi: 'नाइके एयर मैक्स स्नीकर्स',
    descEn: 'Responsive cushioning, breathable mesh upper, and ultimate comfort for daily running.',
    descHi: 'लचीला कुशनिंग, हवादार मेश ऊपरी हिस्सा और दैनिक दौड़ने के लिए सर्वोत्तम आराम।',
    price: 8995,
    unit: 'Pair',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto-format&fit=crop&q=60',
    category: 'Fashion',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-6',
    nameEn: 'Adidas Ultraboost Running Shoes',
    nameHi: 'अडिडास अल्ट्राबूस्ट रनिंग शूज़',
    descEn: 'Boost midsole responsiveness, primeknit upper, and sustainable material construction.',
    descHi: 'बूस्ट मिडसोल रिस्पॉन्सिबिलिटी, प्राइमकनिट ऊपरी भाग और पर्यावरण अनुकूल सामग्री।',
    price: 14999,
    unit: 'Pair',
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto-format&fit=crop&q=60',
    category: 'Fashion',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-7',
    nameEn: 'Classic Leather Jacket',
    nameHi: 'क्लासिक लेदर जैकेट',
    descEn: 'Genuine lambskin leather jacket with premium zippers and comfortable inner lining.',
    descHi: 'प्रीमियम ज़िपर और आरामदायक इनर लाइनिंग के साथ असली लेदर जैकेट।',
    price: 6999,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto-format&fit=crop&q=60',
    category: 'Fashion',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-8',
    nameEn: 'Ray-Ban Aviator Sunglasses',
    nameHi: 'रे-बैन एविएटर धूप का चश्मा',
    descEn: 'Polarized lenses, classic gold metal frame, and 100% UV protection.',
    descHi: 'ध्रुवीकृत लेंस, क्लासिक सोने का मेटल फ्रेम और 100% यूवी सुरक्षा।',
    price: 9490,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto-format&fit=crop&q=60',
    category: 'Fashion',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-9',
    nameEn: 'Espresso Coffee Machine',
    nameHi: 'एस्प्रेसो कॉफी मशीन',
    descEn: 'High-pressure pump, built-in milk frother, and easy-clean removable drip tray.',
    descHi: 'उच्च दबाव पंप, इन-बिल्ट मिल्क फ्रॉदर और साफ करने में आसान ड्रिप ट्रे।',
    price: 12499,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=500&auto-format&fit=crop&q=60',
    category: 'Home & Kitchen',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-10',
    nameEn: 'Digital Air Fryer',
    nameHi: 'डिजिटल एयर फ्रायर',
    descEn: 'Oil-free healthy frying, large capacity basket, and touch preset controls.',
    descHi: 'तेल मुक्त स्वस्थ फ्राइंग, बड़ी क्षमता वाली टोकरी और टच प्रीसेट कंट्रोल।',
    price: 5999,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=500&auto-format&fit=crop&q=60',
    category: 'Home & Kitchen',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-11',
    nameEn: 'Robotic Vacuum Cleaner',
    nameHi: 'रोबोटिक वैक्यूम क्लीनर',
    descEn: 'Smart mapping navigation, strong suction, automatic charging, and app control.',
    descHi: 'स्मार्ट मैपिंग नेविगेशन, मजबूत सक्शन, स्वचालित चार्जिंग और ऐप नियंत्रण।',
    price: 21999,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1589634749000-1e72436452f0?w=500&auto-format&fit=crop&q=60',
    category: 'Home & Kitchen',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-12',
    nameEn: '15-Piece Cookware Set',
    nameHi: '15-पीस नॉन-स्टिक कुकवेयर सेट',
    descEn: 'Durable non-stick coating, heat-resistant handles, and tempered glass lids.',
    descHi: 'टिकाऊ नॉन-स्टिक कोटिंग, गर्मी प्रतिरोधी हैंडल और टेम्पर्ड ग्लास लिड्स।',
    price: 4999,
    unit: 'Set',
    imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500&auto-format&fit=crop&q=60',
    category: 'Home & Kitchen',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-13',
    nameEn: 'Vitamin C Face Serum',
    nameHi: 'विटामिन सी फेस सीरम',
    descEn: 'Brightens skin, reduces dark spots, and provides deep hydration and anti-aging benefits.',
    descHi: 'त्वचा को चमकदार बनाता है, काले धब्बों को कम करता है और गहरा हाइड्रेशन देता है।',
    price: 599,
    unit: 'Bottle',
    imageUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&auto-format&fit=crop&q=60',
    category: 'Beauty & Care',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-14',
    nameEn: 'Premium Luxury Eau de Parfum',
    nameHi: 'प्रीमियम लक्जरी इत्र',
    descEn: 'Long-lasting floral and woody fragrance notes, elegant bottle design.',
    descHi: 'लंबे समय तक रहने वाली फूलों और लकड़ी की खुशबू, सुरुचिपूर्ण बोतल डिजाइन।',
    price: 3499,
    unit: 'Bottle',
    imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto-format&fit=crop&q=60',
    category: 'Beauty & Care',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-15',
    nameEn: 'Professional Ionic Hair Dryer',
    nameHi: 'प्रोफेशनल आयनिक हेयर ड्रायर',
    descEn: 'Fast drying, multiple heat settings, cool shot button, and diffuser attachment included.',
    descHi: 'तेजी से सुखाने, कई गर्मी सेटिंग्स, कूल शॉट बटन और डिफ्यूज़र अटैचमेंट शामिल हैं।',
    price: 2299,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto-format&fit=crop&q=60',
    category: 'Beauty & Care',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-16',
    nameEn: 'Orthopedic Memory Foam Mattress',
    nameHi: 'ऑर्थोपेडिक मेमोरी फोम गद्दे',
    descEn: 'Medium-firm pressure relief, breathable cool gel memory foam, and motion isolation.',
    descHi: 'मध्यम-सख्त दबाव से राहत, सांस लेने योग्य कूल जेल मेमोरी फोम और मोशन मोशन।',
    price: 14999,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&auto-format&fit=crop&q=60',
    category: 'Furniture & Decor',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-17',
    nameEn: 'Wi-Fi Smart LED RGB Bulb',
    nameHi: 'वाई-फाई स्मार्ट एलईडी आरजीबी बल्ब',
    descEn: '16 million colors, voice control with Alexa/Google Assistant, dimmable, no hub required.',
    descHi: '16 मिलियन रंग, एलेक्सा/गूगल असिस्टेंट के साथ वॉयस कंट्रोल, डिमेबल।',
    price: 799,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=500&auto-format&fit=crop&q=60',
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-18',
    nameEn: 'Waterproof Travel Backpack',
    nameHi: 'वॉटरप्रूफ ट्रैवल बैकपैक',
    descEn: 'Large capacity, dedicated laptop compartment, USB charging port, and anti-theft pocket.',
    descHi: 'बड़ी क्षमता, समर्पित लैपटॉप कम्पार्टमेंट, यूएसबी चार्जिंग पोर्ट और एंटी-थेफ्ट पॉकेट।',
    price: 1899,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto-format&fit=crop&q=60',
    category: 'Fashion',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-19',
    nameEn: 'Portable Waterproof Speaker',
    nameHi: 'पोर्टेबल वॉटरप्रूफ ब्लूटूथ स्पीकर',
    descEn: 'Deep bass, 24-hour playtime, IPX7 waterproof rating, and durable fabric design.',
    descHi: 'गहरी बास, 24 घंटे का प्लेटाइम, IPX7 वाटरप्रूफ रेटिंग और टिकाऊ डिज़ाइन।',
    price: 3999,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto-format&fit=crop&q=60',
    category: 'Electronics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-20',
    nameEn: 'Eco-Friendly Non-Slip Yoga Mat',
    nameHi: 'इको-फ्रेंडली नॉन-स्लिप योग मैट',
    descEn: 'Optimal cushioning, dual-sided non-slip texture, carrying strap included.',
    descHi: 'इष्टतम कुशनिंग, दोहरी तरफा नॉन-स्लिप बनावट, ले जाने वाली पट्टी शामिल है।',
    price: 1199,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500&auto-format&fit=crop&q=60',
    category: 'Fitness',
    createdAt: new Date().toISOString()
  },
  {
    id: 'retail-21',
    nameEn: 'Stainless Steel Electric Kettle',
    nameHi: 'स्टेनलेस स्टील इलेक्ट्रिक केतली',
    descEn: '1.5L capacity, fast boiling, auto shut-off, and boil-dry protection.',
    descHi: '1.5L क्षमता, तेजी से उबलना, ऑटो शट-ऑफ और उबाल-सूखा संरक्षण।',
    price: 1499,
    unit: 'Piece',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto-format&fit=crop&q=60',
    category: 'Home & Kitchen',
    createdAt: new Date().toISOString()
  }
];

export default function ProductCatalog() {
  const [lang, setLang] = useState<LangType>('en');
  const { user, profileName, userProfile, refreshProfile, logout } = useAuth();

  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSignOutClick = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await logout();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_catalog_products');
        return cached ? JSON.parse(cached) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_global_settings');
        return cached ? JSON.parse(cached) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedProd = localStorage.getItem('cached_catalog_products');
        const cachedSet = localStorage.getItem('cached_global_settings');
        return !(cachedProd && cachedSet);
      } catch (e) {
        return true;
      }
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { variantName?: string; imageUrl?: string }>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [activeView, setActiveView] = useState<'products' | 'orders' | 'profile'>('products');
  
  // Dynamic window/tab title
  useEffect(() => {
    const viewTitles: Record<string, string> = {
      products: 'Balaji Textiles - Shop Products',
      orders: 'Balaji Textiles - My Orders',
      profile: 'Balaji Textiles - My Profile'
    };
    document.title = viewTitles[activeView] || 'Balaji Textiles';
  }, [activeView]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile edit states
  const [profileFields, setProfileFields] = useState<ProfileField[]>([]);
  const [profileValues, setProfileValues] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState(profileName || user?.displayName || '');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const t = (key: any) => getTranslation(lang, key);

  useEffect(() => {
    if (activeView === 'profile') {
      const fetchProfileFields = async () => {
        setLoadingProfile(true);
        try {
          const fields = await getProfileFields();
          setProfileFields(fields);
          
          const vals: Record<string, string> = {};
          fields.forEach(f => {
            vals[f.id || ''] = userProfile?.customDetails?.[f.id || ''] || '';
          });
          setProfileValues(vals);
          setEditName(userProfile?.name || user?.displayName || '');
        } catch (err) {
          console.error("Error fetching profile fields:", err);
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchProfileFields();
    }
  }, [activeView, userProfile, user]);

  const handleProfileFieldChange = (fieldId: string, val: string) => {
    setProfileValues(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!editName.trim()) {
      setProfileError(t('nameRequired'));
      return;
    }

    for (const field of profileFields) {
      if (field.required && !profileValues[field.id || '']?.trim()) {
        setProfileError(t('fillRequiredWarning'));
        return;
      }
    }

    setSavingProfile(true);
    try {
      if (user) {
        await completeUserProfileRegistration(user.uid, profileValues, editName);
        await refreshProfile();
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setProfileError(err.message || t('errorOccurred'));
    } finally {
      setSavingProfile(false);
    }
  };

  // Load products from database paginated
  useEffect(() => {
    async function loadProducts() {
      // Legacy cache cleanup: if cached catalog is too large, clear it to avoid quota limits
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('cached_catalog_products');
          if (cached && cached.length > 500000) {
            localStorage.removeItem('cached_catalog_products');
            localStorage.removeItem('cached_salesman_products');
          }
        } catch (e) {}
      }
      try {
        const [res, settings] = await Promise.all([
          getProductsPaginated(null, 15),
          getGlobalSettings()
        ]);
        setProducts(res.products);
        setLastVisible(res.lastVisible);
        setHasMore(res.hasMore);
        setGlobalSettings(settings);
        if (typeof window !== 'undefined') {
          try {
            const cacheProds = res.products.slice(0, 10).map((p: any) => ({
              ...p,
              imageUrl: p.imageUrl?.startsWith('data:') ? '' : p.imageUrl,
              images: p.images?.map((img: any) => ({
                ...img,
                url: img.url.startsWith('data:') ? '' : img.url
              })) || []
            }));
            localStorage.setItem('cached_catalog_products', JSON.stringify(cacheProds));
            localStorage.setItem('cached_global_settings', JSON.stringify(settings));
          } catch (e) {
            console.warn("Unable to cache products (quota exceeded):", e);
          }
        }
      } catch (err) {
        console.error("Error loading products:", err);
        // Retain existing cached products on error to avoid blanking out the grid
        setProducts(prev => prev.length > 0 ? prev : []);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleLoadMoreProducts = async () => {
    if (loadingMore || !hasMore || !lastVisible) return;
    setLoadingMore(true);
    try {
      const res = await getProductsPaginated(lastVisible, 15);
      setProducts(prev => [...prev, ...res.products]);
      setLastVisible(res.lastVisible);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Error loading more products:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchUserOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const allOrders = await getOrders();
      const filtered = allOrders.filter(o => o.userUid === user.uid);
      setUserOrders(filtered);
    } catch (err) {
      console.error("Failed to load user orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserOrders();
    }
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await deleteOrder(orderId);
      setUserOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Failed to cancel order. Please try again.");
    }
  };

  const handleUpdateOrder = async (orderId: string, updatedItems: OrderItem[]) => {
    try {
      await updateOrder(orderId, {
        items: updatedItems
      });
      setUserOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: updatedItems } : o));
    } catch (err) {
      console.error("Failed to update order:", err);
      alert("Failed to update order. Please try again.");
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'hi' : 'en');
  };

  const handleToggleProduct = (id: string, variantName?: string, imageUrl?: string) => {
    const cartKey = id + '|' + (variantName || '');
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cartKey)) {
        next.delete(cartKey);
        setSelectedVariants(prevVars => {
          const nextVars = { ...prevVars };
          delete nextVars[cartKey];
          return nextVars;
        });
      } else {
        next.add(cartKey);
        setSelectedVariants(prevVars => ({
          ...prevVars,
          [cartKey]: { variantName, imageUrl }
        }));
      }
      return next;
    });
  };

  const handlePlaceOrder = async () => {
    if (selectedIds.size === 0 || !user) return;
    setSubmittingOrder(true);

    try {
      const items: OrderItem[] = [];
      selectedIds.forEach(cartKey => {
        const [id, variantName] = cartKey.split('|');
        const product = products.find(p => p.id === id);
        if (product) {
          const details = selectedVariants[cartKey];
          const item: OrderItem = {
            productId: product.id || '',
            nameEn: product.nameEn,
            nameHi: product.nameHi,
            price: product.price,
            unit: product.unit,
            quantity: 1,
            code: product.code || '',
            design: product.design || '',
            selectedImageUrl: details?.imageUrl || product.imageUrl || '',
          };
          // Only include optional fields when they have real values (Firestore rejects undefined)
          const variant = details?.variantName || variantName;
          if (variant) item.selectedVariant = variant;
          if (product.priceRangePct !== undefined) item.priceRangePct = product.priceRangePct;
          if ((product as any).minPrice !== undefined) item.minPrice = (product as any).minPrice;
          if ((product as any).maxPrice !== undefined) item.maxPrice = (product as any).maxPrice;
          items.push(item);
        }
      });

      await createOrder({
        userUid: user.uid,
        userName: profileName || user.displayName || 'Client',
        userEmail: user.email || '',
        items
      });

      setShowSuccessModal(true);
      setSelectedIds(new Set());
      setSelectedVariants({});
      fetchUserOrders();
    } catch (err) {
      console.error("Order submission failed:", err);
      alert("Failed to submit order request. Please try again or call us.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Helper to get Category/Product Icons for Retail Store
  const getProductIcon = (category: string, size = "w-6 h-6") => {
    switch (category.toLowerCase()) {
      case 'electronics':
        return <Smartphone className={size} />;
      case 'fashion':
        return <Shirt className={size} />;
      case 'home & kitchen':
        return <HomeIcon className={size} />;
      case 'beauty & care':
        return <Sparkles className={size} />;
      case 'furniture & decor':
        return <Bed className={size} />;
      case 'fitness':
        return <Activity className={size} />;
      default:
        return <Package className={size} />;
    }
  };

  // Filter products by search query, hiding out-of-stock items
  const visibleProducts = products.filter(product => product.inStock !== false);
  const filteredProducts = visibleProducts.filter(product => {
    const name = lang === 'en' ? product.nameEn : product.nameHi;
    const desc = lang === 'en' ? product.descEn : product.descHi;
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${activeView === 'products' ? 'bg-black md:bg-slate-50 md:dark:bg-zinc-950 pb-0 md:pb-24' : 'bg-slate-50 dark:bg-zinc-950 pb-36 sm:pb-24'}`}>
      
      {/* Visual Header */}
      <header className={`sticky top-0 z-40 py-3 px-4 sm:py-4 sm:px-6 flex items-center justify-between backdrop-blur-md transition-all ${activeView === 'products' ? 'bg-black/50 md:bg-white/80 md:dark:bg-zinc-900/80 border-b border-white/10 md:border-slate-200 md:dark:border-zinc-800 md:shadow-sm' : 'bg-white/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 shadow-sm'}`}>
        
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-white shadow-md animate-pulse ${activeView === 'products' ? 'bg-white/20 md:bg-[#5d51e8] shadow-white/10 md:shadow-[#5d51e8]/20' : 'bg-[#5d51e8] shadow-[#5d51e8]/20'}`}>
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className={`font-black text-base sm:text-xl tracking-tight leading-none ${activeView === 'products' ? 'text-white md:text-slate-955 md:dark:text-white' : 'text-slate-955 dark:text-white'}`}>
              Balaji Textiles
            </h1>
            <span className={`text-[8px] sm:text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full mt-0.5 sm:mt-1 inline-block ${activeView === 'products' ? 'text-emerald-300 bg-emerald-900/30 md:text-emerald-600 md:bg-emerald-50 md:dark:bg-emerald-955/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30'}`}>
              Premium Storefront
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Header Navigation - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button
              type="button"
              onClick={() => setActiveView('products')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeView === 'products'
                  ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-805 dark:text-zinc-305 dark:hover:bg-zinc-700'
              }`}
              title="Shop Products"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Shop</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setActiveView('orders');
                fetchUserOrders();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeView === 'orders'
                  ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-805 dark:text-zinc-305 dark:hover:bg-zinc-700'
              }`}
              title="My Orders"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeView === 'profile'
                  ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-zinc-805 dark:text-zinc-305 dark:hover:bg-zinc-700'
              }`}
              title="My Profile"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </div>

          {/* Desktop Sign Out */}
          <button 
            type="button"
            onClick={handleSignOutClick}
            className="hidden md:flex p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(true)}
            className={`md:hidden w-10 h-10 border rounded-full flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer ${
              activeView === 'products' 
                ? 'bg-white/10 border-white/20 backdrop-blur-md' 
                : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'
            }`}
            title="Menu"
          >
            <Menu className={`w-5 h-5 ${activeView === 'products' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`} />
          </button>
        </div>
      </header>

      {/* Mobile Top Dropdown Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Top Sheet */}
          <div className="absolute top-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-b-[2rem] shadow-2xl animate-in slide-in-from-top duration-300">
            {/* Header with close */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-[#5d51e8] p-2 rounded-xl text-white shadow-md shadow-[#5d51e8]/20">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Balaji Textiles</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="px-4 pb-5 space-y-1.5">
              {[
                { key: 'products' as const, icon: Package, label: 'Shop Products', desc: 'Browse & add items to your order' },
                { key: 'orders' as const, icon: ClipboardList, label: 'My Orders', desc: 'Track your order history & status' },
                { key: 'profile' as const, icon: User, label: 'My Profile', desc: 'View & edit your profile details' },
              ].map((item) => {
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveView(item.key);
                      if (item.key === 'orders') fetchUserOrders();
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer ${
                      isActive
                        ? 'bg-[#5d51e8]/10 border border-[#5d51e8]/20'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/20'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-black ${
                        isActive ? 'text-[#5d51e8]' : 'text-slate-800 dark:text-slate-200'
                      }`}>{item.label}</p>
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">{item.desc}</p>
                    </div>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-[#5d51e8] animate-pulse" />
                    )}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-zinc-800 my-2" />

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileMenu(false);
                  handleSignOutClick();
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left hover:bg-red-50 dark:hover:bg-red-950/10 transition-all active:scale-[0.98] cursor-pointer border border-transparent"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 dark:bg-red-950/20 text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-red-600 dark:text-red-400">Sign Out</p>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">Log out from your account</p>
                </div>
              </button>
            </div>

            {/* Handle bar at bottom */}
            <div className="flex justify-center pb-3">
              <div className="w-10 h-1 bg-slate-200 dark:bg-zinc-700 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-grow w-full mx-auto ${activeView === 'products' ? 'max-w-none p-0 md:max-w-5xl md:p-5 md:sm:p-8 md:space-y-6' : 'max-w-5xl p-5 sm:p-8 space-y-6'}`}>
        
        {activeView === 'profile' ? (
          <ClientProfileTab
            user={user}
            userProfile={userProfile}
            editName={editName}
            onEditNameChange={setEditName}
            profileFields={profileFields}
            profileValues={profileValues}
            onProfileFieldChange={handleProfileFieldChange}
            onSave={handleSaveProfile}
            savingProfile={savingProfile}
            profileError={profileError}
            profileSuccess={profileSuccess}
            lang={lang}
            t={t}
            onRefreshProfile={refreshProfile}
          />
        ) : activeView === 'orders' ? (
          <ClientOrdersList
            orders={userOrders}
            onCancelOrder={handleCancelOrder}
            onUpdateOrder={handleUpdateOrder}
            priceRangePct={globalSettings?.priceRangePct || 5}
          />
        ) : (
          <ClientProductGrid
            products={visibleProducts}
            filteredProducts={filteredProducts}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedIds={selectedIds}
            onToggleProduct={handleToggleProduct}
            onPlaceOrder={handlePlaceOrder}
            submittingOrder={submittingOrder}
            lang={lang}
            t={t}
            profileName={profileName}
            getProductIcon={getProductIcon}
            categoriesList={globalSettings?.categories || []}
            priceRangePct={globalSettings?.priceRangePct || 5}
            onLoadMore={handleLoadMoreProducts}
            hasMore={hasMore}
          />
        )}
      </main>

      {/* Success Popup Modal */}
      <OrderSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t('orderSuccessTitle')}
        message={t('orderSuccessSub')}
        okText={t('okBtn')}
      />

      {/* Confirm Sign Out Modal */}
      <ConfirmModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out from your account?"
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
      />
    </div>
  );
}
