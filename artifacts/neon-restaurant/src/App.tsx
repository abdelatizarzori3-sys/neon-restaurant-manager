import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParseMenuImage } from '@workspace/api-client-react';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowUpRight, Boxes, Check, ChevronDown, CircleDollarSign,
  ClipboardList, Clock3, Coffee, FileImage, LayoutDashboard, Languages, LoaderCircle,
  Package, Pencil, Plus, Search, Settings2, ShoppingBag, Trash2,
  Utensils, X,
} from 'lucide-react';
import './index.css';

type MenuItem = { id: string; name: string; category: string; price: number; description: string; available: boolean };
type OrderItem = { menuItemId: string; name: string; quantity: number; price: number };
type Order = { id: string; number: string; source: string; status: 'new' | 'preparing' | 'ready' | 'completed'; total: number; createdAt: string; items: OrderItem[] };
type StockItem = { id: string; name: string; quantity: number; unit: string; minQuantity: number; cost: number };
type Expense = { id: string; title: string; category: string; amount: number; date: string };
type StoreData = { menu: MenuItem[]; orders: Order[]; stock: StockItem[]; expenses: Expense[]; language: 'ar' | 'en'; currency: string };
type ParsedDraft = { name: string; category: string; price: number; description: string };

const STORE_KEY = 'neon-restaurant-manager-v1';
const today = new Date().toISOString().slice(0, 10);
const initialData: StoreData = {
  language: 'ar', currency: 'SAR',
  menu: [
    { id: 'm1', name: 'برجر سماش', category: 'الأطباق الرئيسية', price: 42, description: 'لحم بقري، جبنة شيدر، صلصة البيت', available: true },
    { id: 'm2', name: 'باستا ألفريدو', category: 'الأطباق الرئيسية', price: 38, description: 'كريمة طازجة، بارميزان، أعشاب', available: true },
    { id: 'm3', name: 'سلطة جرين هاوس', category: 'المقبلات', price: 26, description: 'أفوكادو، جرجير، صلصة ليمون', available: true },
    { id: 'm4', name: 'لاتيه بارد', category: 'المشروبات', price: 18, description: 'إسبريسو مزدوج وحليب بارد', available: true },
    { id: 'm5', name: 'تشيزكيك التوت', category: 'الحلويات', price: 24, description: 'تشيزكيك مخبوز وتوت طازج', available: false },
  ],
  orders: [
    { id: 'o1', number: '#1048', source: 'داخل المطعم', status: 'preparing', total: 60, createdAt: new Date(Date.now() - 12 * 60000).toISOString(), items: [{ menuItemId: 'm1', name: 'برجر سماش', quantity: 1, price: 42 }, { menuItemId: 'm4', name: 'لاتيه بارد', quantity: 1, price: 18 }] },
    { id: 'o2', number: '#1047', source: 'استلام', status: 'ready', total: 64, createdAt: new Date(Date.now() - 24 * 60000).toISOString(), items: [{ menuItemId: 'm2', name: 'باستا ألفريدو', quantity: 1, price: 38 }, { menuItemId: 'm3', name: 'سلطة جرين هاوس', quantity: 1, price: 26 }] },
    { id: 'o3', number: '#1046', source: 'توصيل', status: 'completed', total: 42, createdAt: new Date(Date.now() - 46 * 60000).toISOString(), items: [{ menuItemId: 'm1', name: 'برجر سماش', quantity: 1, price: 42 }] },
  ],
  stock: [
    { id: 's1', name: 'حبوب قهوة أرابيكا', quantity: 1.8, unit: 'كجم', minQuantity: 2, cost: 68 },
    { id: 's2', name: 'جبنة شيدر', quantity: 5, unit: 'كجم', minQuantity: 2, cost: 94 },
    { id: 's3', name: 'أفوكادو', quantity: 3, unit: 'كجم', minQuantity: 1.5, cost: 36 },
    { id: 's4', name: 'أكواب ورقية', quantity: 42, unit: 'قطعة', minQuantity: 20, cost: 0.8 },
  ],
  expenses: [
    { id: 'e1', title: 'خضار وفواكه طازجة', category: 'مشتريات', amount: 286, date: today },
    { id: 'e2', title: 'فاتورة الكهرباء', category: 'مرافق', amount: 740, date: today },
    { id: 'e3', title: 'مستلزمات تغليف', category: 'تشغيل', amount: 163.5, date: today },
  ],
};

const queryClient = new QueryClient();
const navItems = [
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/menu', key: 'menu', icon: Utensils },
  { href: '/orders', key: 'orders', icon: ClipboardList },
  { href: '/inventory', key: 'inventory', icon: Boxes },
  { href: '/expenses', key: 'expenses', icon: CircleDollarSign },
  { href: '/settings', key: 'settings', icon: Settings2 },
] as const;
const words = {
  ar: {
    dashboard: 'نظرة عامة', menu: 'القائمة', orders: 'الطلبات', inventory: 'المخزون', expenses: 'المصروفات', settings: 'الإعدادات',
    today: 'اليوم في مطعمك', greeting: 'مساحة تشغيل مطعمك', welcome: 'كل شيء واضح. كل شيء تحت السيطرة.',
    revenue: 'مبيعات اليوم', orderCount: 'طلبات اليوم', menuItems: 'أصناف متاحة', lowStock: 'مخزون منخفض',
    salesWeek: 'المبيعات خلال الأسبوع', thisWeek: 'آخر ٧ أيام', recentOrders: 'أحدث الطلبات', seeAll: 'عرض الكل',
    stockAlerts: 'تنبيهات المخزون', expensesToday: 'مصروفات اليوم', menuTitle: 'قائمتك، بطريقتك', menuSub: 'أدر أصنافك وأسعارك وتوفّرها من مكان واحد.',
    addItem: 'إضافة صنف', addExpense: 'إضافة مصروف', createOrder: 'طلب جديد', stockTitle: 'المخزون اليومي', stockSub: 'تابع الكميات قبل أن تنفد.',
    costTitle: 'المصروفات', costSub: 'سجل كل تكلفة وابقَ قريباً من هامش الربح.',
    name: 'الاسم', category: 'الفئة', price: 'السعر', description: 'الوصف', availability: 'التوفّر', actions: 'إجراءات',
    available: 'متاح', unavailable: 'غير متاح', edit: 'تعديل', delete: 'حذف', search: 'ابحث هنا...', all: 'الكل',
    noMenu: 'قائمتك تبدأ من هنا', noMenuText: 'أضف أصنافك يدوياً أو حمّل صورة قائمة ودع المساعد يستخرج مسودة للمراجعة.',
    uploadMenu: 'استيراد القائمة', addManually: 'إضافة يدوية', uploadTitle: 'استيراد قائمة الطعام', uploadSub: 'ارفع صورة واضحة أو ملف CSV، ثم راجع كل صنف قبل إضافته.',
    selectImage: 'اختر صورة أو ملف CSV', imageHint: 'PNG أو JPG أو WEBP أو CSV · حتى 5 ميجابايت', uploadPrivacyNote: 'تُرسل صورة القائمة إلى OpenAI لاستخراج مسودة، وتُحتسب تكلفتها على مفتاح API الخاص بك. ملفات CSV تُقرأ في المتصفح.',
    parse: 'استخراج الأصناف', readCsv: 'قراءة ملف CSV', extracting: 'جارٍ قراءة القائمة...', reviewDrafts: 'راجع الأصناف المستخرجة', saveDrafts: 'إضافة الأصناف للقائمة',
    noDrafts: 'لم يتم العثور على أصناف. جرّب صورة أوضح.', parsedInfo: 'هذه مسودة فقط — عدّل الأسماء والأسعار قبل الحفظ.',
    ordersTitle: 'الطلبات تتحرك هنا', ordersSub: 'إنشاء الطلبات ومتابعة حالتها في الوقت الفعلي.', newOrder: 'إنشاء طلب', noOrders: 'لا توجد طلبات بعد', noOrdersText: 'أنشئ أول طلب من أصناف قائمتك.', orderNumber: 'رقم الطلب', source: 'المصدر', status: 'الحالة', total: 'الإجمالي', time: 'الوقت', nextStatus: 'تحديث الحالة',
    new: 'جديد', preparing: 'قيد التحضير', ready: 'جاهز', completed: 'مكتمل', dineIn: 'داخل المطعم', pickup: 'استلام', delivery: 'توصيل',
    addToOrder: 'أضف صنفاً', quantity: 'الكمية', noItems: 'أضف صنفاً واحداً على الأقل.', orderCreated: 'تم إنشاء الطلب',
    stockItem: 'الصنف', quantityOnHand: 'الكمية الحالية', unit: 'الوحدة', minLevel: 'حد التنبيه', unitCost: 'تكلفة الوحدة', addStock: 'إضافة للمخزون',
    low: 'منخفض', healthy: 'جيد', noStock: 'لا توجد أصناف مخزون', noStockText: 'أضف أول صنف لتعرف ما تحتاجه قبل وقت الذروة.',
    expenseTitle: 'البند', expenseCategory: 'التصنيف', amount: 'المبلغ', date: 'التاريخ', expenseTotal: 'إجمالي اليوم', noExpenses: 'لا توجد مصروفات بعد', noExpensesText: 'سجّل التكاليف اليومية لتعرف أين تذهب المصروفات.',
    language: 'لغة الواجهة', langDesc: 'اختر اللغة واتجاه العرض المناسب لك.', currency: 'العملة', currencyDesc: 'تُستخدم في الأسعار والمبيعات والمصروفات.', arabic: 'العربية', english: 'English', save: 'حفظ', cancel: 'إلغاء',
    restaurant: 'مطعم نيون', independent: 'مطعم مستقل · مساحة محلية', dataInfo: 'بياناتك محفوظة على هذا الجهاز', dataDesc: 'بيانات المطعم محفوظة في هذا المتصفح فقط. تُرسل صورة القائمة المحددة إلى OpenAI عند طلب استخراج الأصناف.',
    add: 'إضافة', update: 'حفظ التغييرات', saved: 'تم الحفظ', removed: 'تم الحذف', confirmDelete: 'هل تريد حذف هذا العنصر؟', noAvailableItems: 'أضف أصنافاً متاحة للقائمة أولاً.',
    fileError: 'نوع الملف غير مدعوم أو حجمه أكبر من 5 ميجابايت. اختر PNG أو JPG أو WEBP أو CSV.', csvError: 'تعذرت قراءة ملف CSV. تأكد من وجود أعمدة للاسم والسعر.', parseError: 'تعذر استخراج القائمة الآن. حاول مرة أخرى أو أضف الأصناف يدوياً.',
  },
  en: {
    dashboard: 'Overview', menu: 'Menu', orders: 'Orders', inventory: 'Inventory', expenses: 'Expenses', settings: 'Settings',
    today: 'TODAY AT YOUR RESTAURANT', greeting: 'Your restaurant, in rhythm', welcome: 'Everything clear. Everything in control.',
    revenue: "Today's sales", orderCount: "Today's orders", menuItems: 'Available items', lowStock: 'Low stock',
    salesWeek: 'Sales this week', thisWeek: 'Last 7 days', recentOrders: 'Recent orders', seeAll: 'View all',
    stockAlerts: 'Stock alerts', expensesToday: "Today's expenses", menuTitle: 'Your menu, your way', menuSub: 'Manage items, prices, and availability in one place.',
    addItem: 'Add item', addExpense: 'Add expense', createOrder: 'New order', stockTitle: 'Daily inventory', stockSub: 'Keep an eye on quantities before they run out.',
    costTitle: 'Expenses', costSub: 'Track every cost and keep your margins in sight.',
    name: 'Name', category: 'Category', price: 'Price', description: 'Description', availability: 'Availability', actions: 'Actions',
    available: 'Available', unavailable: 'Unavailable', edit: 'Edit', delete: 'Delete', search: 'Search...', all: 'All',
    noMenu: 'Your menu starts here', noMenuText: 'Add items manually or upload a menu photo and review the extracted draft.',
    uploadMenu: 'Import menu', addManually: 'Add manually', uploadTitle: 'Import a menu', uploadSub: 'Upload a clear photo or CSV file, then review each item before adding it.',
    selectImage: 'Choose a menu photo or CSV', imageHint: 'PNG, JPG, WEBP, or CSV · up to 5 MB', uploadPrivacyNote: 'Menu photos are sent to OpenAI for extraction and billed to your API key. CSV files are read in your browser.',
    parse: 'Extract items', readCsv: 'Read CSV file', extracting: 'Reading your menu...', reviewDrafts: 'Review extracted items', saveDrafts: 'Add items to menu',
    noDrafts: 'No items found. Try a clearer image.', parsedInfo: 'Draft only — edit names and prices before saving.',
    ordersTitle: 'Orders in motion', ordersSub: 'Create orders and keep each status moving.', newOrder: 'Create order', noOrders: 'No orders yet', noOrdersText: 'Create the first order from your menu items.', orderNumber: 'Order', source: 'Source', status: 'Status', total: 'Total', time: 'Time', nextStatus: 'Update status',
    new: 'New', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', dineIn: 'Dine-in', pickup: 'Pickup', delivery: 'Delivery',
    addToOrder: 'Add an item', quantity: 'Qty', noItems: 'Add at least one item.', orderCreated: 'Order created',
    stockItem: 'Item', quantityOnHand: 'On hand', unit: 'Unit', minLevel: 'Low level', unitCost: 'Unit cost', addStock: 'Add stock item',
    low: 'Low', healthy: 'In stock', noStock: 'No inventory items', noStockText: 'Add your first stock item to know what you need before the rush.',
    expenseTitle: 'Expense', expenseCategory: 'Category', amount: 'Amount', date: 'Date', expenseTotal: "Today's total", noExpenses: 'No expenses yet', noExpensesText: 'Log daily costs to see where your money goes.',
    language: 'Interface language', langDesc: 'Choose the language and reading direction that works for you.', currency: 'Currency', currencyDesc: 'Used across menu prices, sales, and expenses.', arabic: 'العربية', english: 'English', save: 'Save', cancel: 'Cancel',
    restaurant: 'Neon Kitchen', independent: 'Independent restaurant · Local workspace', dataInfo: 'Your data stays on this device', dataDesc: 'Restaurant data stays in this browser. A selected menu photo is sent to OpenAI when you request item extraction.',
    add: 'Add', update: 'Save changes', saved: 'Saved', removed: 'Deleted', confirmDelete: 'Delete this item?', noAvailableItems: 'Add available menu items first.',
    fileError: 'Unsupported file type or larger than 5 MB. Choose PNG, JPG, WEBP, or CSV.', csvError: 'Could not read this CSV. Make sure it has name and price columns.', parseError: "Couldn't extract the menu. Try again or add items manually.",
  },
} as const;

function readStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return { ...initialData, ...parsed, menu: parsed.menu ?? initialData.menu, orders: parsed.orders ?? initialData.orders, stock: parsed.stock ?? initialData.stock, expenses: parsed.expenses ?? initialData.expenses };
  } catch { return initialData; }
}
const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function App() {
  const [data, setData] = useState<StoreData>(readStore);
  const [path, setPath] = useLocation();
  const [toast, setToast] = useState('');
  const lang = data.language;
  const t = words[lang];
  const rtl = lang === 'ar';
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [lang, rtl]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2700);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const update = (key: keyof StoreData, value: StoreData[keyof StoreData]) => setData(current => ({ ...current, [key]: value }));
  const formatMoney = (amount: number) => new Intl.NumberFormat(rtl ? 'ar-SA' : 'en-US', { style: 'currency', currency: data.currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  const pageKey = path === '/' ? 'dashboard' : path.slice(1);
  const title = words[lang][pageKey as keyof typeof words.ar] || t.dashboard;

  return (
    <div className="app-shell" dir={rtl ? 'rtl' : 'ltr'}>
      <aside className="sidebar">
        <Link href="/" className="brand" data-testid="link-home">
          <span className="brand-mark">N</span><span><span className="brand-title">NEON</span><span className="brand-sub">restaurant manager</span></span>
        </Link>
        <div className="nav-label">{rtl ? 'مساحة العمل' : 'WORKSPACE'}</div>
        <nav className="nav-list" aria-label={rtl ? 'التنقل الرئيسي' : 'Main navigation'}>
          {navItems.map(item => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={`nav-item ${path === item.href ? 'active' : ''}`} data-testid={`link-${item.key}`}>
              <span className="nav-icon"><Icon size={17} strokeWidth={1.8} /></span><span>{t[item.key]}</span>
            </Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="restaurant-chip"><div className="restaurant-avatar">N</div><div><div className="restaurant-name">{t.restaurant}</div><div className="restaurant-meta">{t.independent}</div></div><ChevronDown size={14} color="#77838c" /></div>
          <div className="nav-label">{rtl ? 'إصدار أول · محلي' : 'V1 · LOCAL ONLY'}</div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="top-context"><span className="live-dot" />{t.today}<span style={{ color: '#56636d' }}> / </span><span style={{ color: '#dce2e2' }}>{title}</span></div>
          <div className="top-actions"><span className="top-context"><Clock3 size={14} />{new Intl.DateTimeFormat(rtl ? 'ar-SA' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span>
            <button className="lang-button" onClick={() => update('language', rtl ? 'en' : 'ar')} data-testid="button-toggle-language" aria-label={rtl ? 'Switch to English' : 'التبديل إلى العربية'}><Languages size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }} />{rtl ? 'EN' : 'عربي'}</button>
          </div>
        </header>
        <div className="content">
          {path === '/' && <Dashboard data={data} t={t} rtl={rtl} money={formatMoney} go={setPath} />}
          {path === '/menu' && <MenuPage data={data} setData={setData} t={t} money={formatMoney} notify={setToast} />}
          {path === '/orders' && <OrdersPage data={data} setData={setData} t={t} money={formatMoney} notify={setToast} />}
          {path === '/inventory' && <InventoryPage data={data} setData={setData} t={t} money={formatMoney} notify={setToast} />}
          {path === '/expenses' && <ExpensesPage data={data} setData={setData} t={t} money={formatMoney} notify={setToast} />}
          {path === '/settings' && <SettingsPage data={data} setData={setData} t={t} rtl={rtl} notify={setToast} />}
          {!['/', '/menu', '/orders', '/inventory', '/expenses', '/settings'].includes(path) && <div className="empty-state card"><strong>404</strong><p>{rtl ? 'الصفحة غير موجودة' : 'Page not found'}</p><button className="btn" onClick={() => setPath('/')} data-testid="button-return-home">{t.dashboard}</button></div>}
        </div>
      </main>
      <nav className="mobile-nav" aria-label={rtl ? 'التنقل' : 'Navigation'}>
        {navItems.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={path === item.href ? 'active' : ''} data-testid={`mobile-link-${item.key}`}><Icon size={17} />{t[item.key]}</Link>; })}
      </nav>
      {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
    </div>
  );
}

type PageProps = { data: StoreData; setData: React.Dispatch<React.SetStateAction<StoreData>>; t: typeof words.ar | typeof words.en; money: (amount: number) => string; notify: (message: string) => void };

function Dashboard({ data, t, rtl, money, go }: { data: StoreData; t: typeof words.ar | typeof words.en; rtl: boolean; money: (amount: number) => string; go: (path: string) => void }) {
  const dailyOrders = data.orders.filter(order => order.createdAt.slice(0, 10) === today);
  const revenue = dailyOrders.reduce((sum, order) => sum + order.total, 0);
  const dailyExpenses = data.expenses.filter(item => item.date === today).reduce((sum, item) => sum + item.amount, 0);
  const lowItems = data.stock.filter(item => item.quantity <= item.minQuantity);
  const bars = [42, 65, 52, 82, 60, 93, Math.max(36, Math.min(100, revenue / 7 || 56))];
  const days = rtl ? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return <>
    <div className="page-heading"><div><div className="eyebrow">{t.today}</div><h1>{t.greeting}</h1><div className="heading-note">{t.welcome}</div></div><button className="btn" onClick={() => go('/orders')} data-testid="button-dashboard-new-order"><Plus size={15} />{t.createOrder}</button></div>
    <div className="stats-grid">
      <Stat title={t.revenue} value={money(revenue)} foot={rtl ? 'من الطلبات المسجلة اليوم' : 'from orders recorded today'} color="var(--lime)" glow="rgba(211,255,84,.14)" icon={<CircleDollarSign size={17} />} />
      <Stat title={t.orderCount} value={String(dailyOrders.length).padStart(2, '0')} foot={rtl ? 'طلبات نشطة ومكتملة' : 'active and completed'} color="var(--cyan)" glow="rgba(84,232,223,.13)" icon={<ShoppingBag size={17} />} />
      <Stat title={t.menuItems} value={`${data.menu.filter(item => item.available).length}/${data.menu.length}`} foot={rtl ? 'أصناف في القائمة' : 'items on your menu'} color="var(--pink)" glow="rgba(255,119,183,.13)" icon={<Utensils size={17} />} />
      <Stat title={t.lowStock} value={String(lowItems.length).padStart(2, '0')} foot={rtl ? 'تحتاج إلى متابعة' : 'need your attention'} color="var(--orange)" glow="rgba(255,180,91,.13)" icon={<Package size={17} />} />
    </div>
    <div className="dashboard-grid">
      <section className="card section-card">
        <div className="section-head"><div><div className="section-title">{t.salesWeek}</div><div className="section-caption">{t.thisWeek}</div></div><span className="pill pill-cyan">{<ArrowUpRight size={12} />} +12.8%</span></div>
        <div className="chart-wrap" aria-label={t.salesWeek} data-testid="chart-weekly-sales">
          {bars.map((value, index) => <div className="chart-column" key={index}><span className="chart-value">{index === 6 ? money(revenue).replace(/[^\d.,]/g, '') : `${value * 9}`}</span><div className="chart-bar" style={{ height: `${value}%`, animationDelay: `${index * 45}ms` }} /><span className="chart-label">{days[index]}</span></div>)}
        </div>
      </section>
      <section className="card section-card">
        <div className="section-head"><div><div className="section-title">{t.recentOrders}</div><div className="section-caption">{rtl ? 'آخر ما وصل للمطبخ' : 'Latest tickets to the kitchen'}</div></div><button className="text-link" onClick={() => go('/orders')} data-testid="button-view-orders">{t.seeAll}</button></div>
        {data.orders.length ? <div className="order-list">{data.orders.slice(0, 3).map(order => <div className="order-line" key={order.id} data-testid={`row-recent-order-${order.id}`}><div><div className="order-name">{order.number} · {order.items[0]?.name ?? ''}</div><div className="order-meta">{statusLabel(order.status, t)} · {timeAgo(order.createdAt, rtl)}</div></div><div className="order-price">{money(order.total)}</div></div>)}</div> : <Empty title={t.noOrders} text={t.noOrdersText} />}
      </section>
    </div>
    <div className="lower-grid">
      <section className="card section-card"><div className="section-head"><div><div className="section-title">{t.stockAlerts}</div><div className="section-caption">{lowItems.length} {rtl ? 'أصناف أقل من حد التنبيه' : 'items below their threshold'}</div></div><button className="text-link" onClick={() => go('/inventory')} data-testid="button-view-inventory">{t.seeAll}</button></div>
        {lowItems.length ? lowItems.map(item => <div className="stock-alert" key={item.id}><span className="alert-mark" /><span className="stock-name">{item.name}</span><span className="stock-qty">{item.quantity} {item.unit} / {item.minQuantity}</span></div>) : <div className="stock-alert"><Check size={15} color="var(--lime)" /><span className="stock-name">{rtl ? 'كل المخزون ضمن المستوى' : 'All stock is above its threshold'}</span><span className="pill pill-green">{t.healthy}</span></div>}
      </section>
      <section className="card section-card"><div className="section-head"><div><div className="section-title">{t.expensesToday}</div><div className="section-caption">{rtl ? 'إجمالي التكاليف المسجلة' : 'Recorded operating costs'}</div></div><button className="text-link" onClick={() => go('/expenses')} data-testid="button-view-expenses">{t.seeAll}</button></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 5px' }}><span className="section-caption">{rtl ? 'إجمالي اليوم' : "Today's total"}</span><strong className="mono" style={{ fontSize: 22 }}>{money(dailyExpenses)}</strong></div>
        <div style={{ height: 5, borderRadius: 9, background: '#323b44', marginTop: 15, overflow: 'hidden' }}><div style={{ width: `${Math.min(dailyExpenses / (revenue || 1000) * 100, 100)}%`, height: '100%', background: 'var(--pink)', borderRadius: 8 }} /></div>
      </section>
    </div>
  </>;
}
function Stat({ title, value, foot, icon, color, glow }: { title: string; value: string; foot: string; icon: ReactNode; color: string; glow: string }) {
  return <section className="card stat-card" style={{ '--accent': color, '--glow': glow } as React.CSSProperties} data-testid={`stat-${title}`}><div className="stat-top"><span>{title}</span><span className="stat-icon">{icon}</span></div><div className="stat-number">{value}</div><div className="stat-foot">{foot}</div></section>;
}
function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><div className="heading-note">{subtitle}</div></div>{action}</div>;
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Activity size={19} /></div><strong>{title}</strong><p>{text}</p>{action}</div>;
}
function Modal({ title, subtitle, children, onClose, footer, testId }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; footer?: ReactNode; testId: string }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby={`${testId}-title`} data-testid={`dialog-${testId}`}><header className="modal-head"><div><div className="modal-title" id={`${testId}-title`}>{title}</div>{subtitle && <div className="section-caption">{subtitle}</div>}</div><button className="close-button" onClick={onClose} aria-label="Close" data-testid={`button-close-${testId}`}><X size={15} /></button></header><div className="modal-body">{children}</div>{footer && <footer className="modal-foot">{footer}</footer>}</section></div>;
}

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = source.replace(/^\uFEFF/, '');

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  return rows;
}

function parseMenuCsv(source: string, language: 'ar' | 'en'): ParsedDraft[] {
  const rows = parseCsvRows(source);
  if (!rows.length) return [];

  const header = rows[0].map(value => value.toLowerCase().replace(/[\s_-]+/g, ''));
  const findColumn = (names: string[]) => header.findIndex(value => names.includes(value));
  const nameColumn = findColumn(['name', 'item', 'dish', 'product', 'الاسم', 'الصنف', 'اسم الصنف', 'الطبق'].map(value => value.replace(/\s/g, '')));
  const priceColumn = findColumn(['price', 'cost', 'السعر', 'الثمن']);
  const categoryColumn = findColumn(['category', 'section', 'الفئة', 'التصنيف', 'القسم'].map(value => value.replace(/\s/g, '')));
  const descriptionColumn = findColumn(['description', 'details', 'الوصف', 'التفاصيل'].map(value => value.replace(/\s/g, '')));
  const hasHeader = nameColumn >= 0 && priceColumn >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const columns = hasHeader
    ? { name: nameColumn, category: categoryColumn, price: priceColumn, description: descriptionColumn }
    : { name: 0, category: 1, price: 2, description: 3 };

  return dataRows.flatMap(cells => {
    const name = cells[columns.name]?.trim() ?? '';
    const rawPrice = cells[columns.price]?.trim() ?? '';
    const normalizedPrice = rawPrice
      .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/٫/g, '.')
      .replace(/[٬\s]/g, '')
      .replace(/[^\d.-]/g, '');
    const price = Number(normalizedPrice);
    if (!name || !rawPrice || !Number.isFinite(price) || price < 0) return [];
    return [{
      name,
      category: cells[columns.category]?.trim() || (language === 'ar' ? 'أخرى' : 'Other'),
      price,
      description: cells[columns.description]?.trim() ?? '',
    }];
  });
}

function MenuPage({ data, setData, t, money, notify }: PageProps) {
  const [modal, setModal] = useState<'item' | 'upload' | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '' });
  const parser = useParseMenuImage();
  const [drafts, setDrafts] = useState<ParsedDraft[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const categories = useMemo(() => [...new Set(data.menu.map(item => item.category))], [data.menu]);
  const filtered = data.menu.filter(item => (filter === 'all' || item.category === filter) && `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  const openAdd = () => { setEditing(null); setForm({ name: '', category: '', price: '', description: '' }); setModal('item'); };
  const openEdit = (item: MenuItem) => { setEditing(item); setForm({ name: item.name, category: item.category, price: String(item.price), description: item.description }); setModal('item'); };
  const saveItem = (event: FormEvent) => {
    event.preventDefault();
    const item: MenuItem = { id: editing?.id ?? id(), name: form.name.trim(), category: form.category.trim(), price: Number(form.price), description: form.description.trim(), available: editing?.available ?? true };
    if (!item.name || !item.category || !Number.isFinite(item.price) || item.price < 0) return;
    setData(current => ({ ...current, menu: editing ? current.menu.map(row => row.id === editing.id ? item : row) : [item, ...current.menu] }));
    setModal(null); notify(t.saved);
  };
  const chooseFile = (file?: File) => {
    setFileError('');
    if (!file) return;
    const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    if ((!isCsv && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) || file.size > 5_000_000) { setFileError(t.fileError); return; }
    setSelectedFile(file); setDrafts([]);
  };
  const parseImage = async () => {
    if (!selectedFile) return;
    const isCsv = selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv');
    if (isCsv) {
      try {
        const parsed = parseMenuCsv(await selectedFile.text(), data.language);
        if (!parsed.length) { setFileError(t.csvError); return; }
        setDrafts(parsed);
      } catch {
        setFileError(t.csvError);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const encoded = String(reader.result).split(',')[1];
      parser.mutate({ data: { mimeType: selectedFile.type as 'image/jpeg' | 'image/png' | 'image/webp', imageBase64: encoded } }, {
        onSuccess: result => setDrafts(result.items.map(item => ({ name: item.name, category: item.category, price: item.price, description: item.description ?? '' }))),
        onError: () => setFileError(t.parseError),
      });
    };
    reader.onerror = () => setFileError(t.parseError);
    reader.readAsDataURL(selectedFile);
  };
  const saveDrafts = () => {
    const valid = drafts.filter(item => item.name.trim() && item.category.trim() && Number.isFinite(Number(item.price)) && Number(item.price) >= 0);
    setData(current => ({ ...current, menu: [...valid.map(item => ({ ...item, id: id(), available: true, price: Number(item.price) })), ...current.menu] }));
    setDrafts([]); setSelectedFile(null); setModal(null); notify(t.saved);
  };
  const remove = (item: MenuItem) => {
    if (!window.confirm(t.confirmDelete)) return;
    setData(current => ({ ...current, menu: current.menu.filter(row => row.id !== item.id) })); notify(t.removed);
  };
  return <>
    <PageHeader eyebrow={t.menu} title={t.menuTitle} subtitle={t.menuSub} action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-secondary" onClick={() => { setModal('upload'); setFileError(''); setDrafts([]); setSelectedFile(null); }} data-testid="button-upload-menu"><FileImage size={15} />{t.uploadMenu}</button><button className="btn" onClick={openAdd} data-testid="button-add-menu-item"><Plus size={15} />{t.addItem}</button></div>} />
    <div className="card table-card">
      <div className="toolbar"><div className="search-field"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} data-testid="input-search-menu" /></div><select className="field" value={filter} onChange={event => setFilter(event.target.value)} aria-label={t.category} data-testid="select-menu-category"><option value="all">{t.all}</option>{categories.map(category => <option key={category}>{category}</option>)}</select><span className="section-caption" data-testid="text-menu-count">{filtered.length} / {data.menu.length} {t.menu}</span></div>
      {filtered.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t.name}</th><th>{t.category}</th><th>{t.price}</th><th>{t.availability}</th><th>{t.actions}</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} data-testid={`row-menu-${item.id}`}><td><div className="item-name">{item.name}</div><div className="item-detail">{item.description || '—'}</div></td><td><span className="pill pill-muted">{item.category}</span></td><td className="mono">{money(item.price)}</td><td><button className={`pill ${item.available ? 'pill-green' : 'pill-muted'}`} onClick={() => setData(current => ({ ...current, menu: current.menu.map(row => row.id === item.id ? { ...row, available: !row.available } : row) }))} data-testid={`button-toggle-availability-${item.id}`}>{item.available ? t.available : t.unavailable}</button></td><td><div className="row-actions"><button className="small-action" onClick={() => openEdit(item)} aria-label={`${t.edit} ${item.name}`} data-testid={`button-edit-menu-${item.id}`}><Pencil size={13} /></button><button className="small-action delete" onClick={() => remove(item)} aria-label={`${t.delete} ${item.name}`} data-testid={`button-delete-menu-${item.id}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : data.menu.length ? <Empty title={t.noMenu} text={t.noMenuText} /> : <Empty title={t.noMenu} text={t.noMenuText} action={<><button className="btn btn-secondary" onClick={() => setModal('upload')} data-testid="button-empty-upload">{t.uploadMenu}</button> <button className="btn" onClick={openAdd} data-testid="button-empty-add">{t.addManually}</button></>} />}
    </div>
    {modal === 'item' && <Modal title={editing ? t.edit : t.addItem} onClose={() => setModal(null)} testId="menu-item" footer={<><button className="btn btn-quiet" onClick={() => setModal(null)} data-testid="button-cancel-menu">{t.cancel}</button><button form="menu-form" className="btn" type="submit" data-testid="button-save-menu">{editing ? t.update : t.add}</button></>}><form id="menu-form" className="form-grid" onSubmit={saveItem}>
      <Field label={t.name}><input required autoFocus value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} data-testid="input-menu-name" /></Field><Field label={t.category}><input required list="menu-categories" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} data-testid="input-menu-category" /><datalist id="menu-categories">{categories.map(category => <option key={category} value={category} />)}</datalist></Field><Field label={t.price}><input required type="number" min="0" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} data-testid="input-menu-price" /></Field><Field label={t.description} full><textarea rows={2} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} data-testid="input-menu-description" /></Field></form></Modal>}
    {modal === 'upload' && <Modal title={t.uploadTitle} subtitle={t.uploadSub} onClose={() => { setModal(null); parser.reset(); }} testId="menu-upload" footer={<><button className="btn btn-quiet" onClick={() => setModal(null)} data-testid="button-cancel-upload">{t.cancel}</button>{drafts.length > 0 ? <button className="btn" onClick={saveDrafts} data-testid="button-save-drafts"><Check size={14} />{t.saveDrafts}</button> : <button className="btn" onClick={parseImage} disabled={!selectedFile || parser.isPending} data-testid="button-parse-menu">{parser.isPending ? <><LoaderCircle size={14} />{t.extracting}</> : <><FileImage size={14} />{selectedFile?.name.toLowerCase().endsWith('.csv') ? t.readCsv : t.parse}</>}</button>}</>}>
      {!drafts.length ? <><label className="upload-zone" htmlFor="menu-photo"><FileImage size={22} /><strong>{selectedFile?.name ?? t.selectImage}</strong><span>{t.imageHint}</span><span className="section-caption">{t.uploadPrivacyNote}</span></label><input id="menu-photo" type="file" accept="image/png,image/jpeg,image/webp,.csv,text/csv" hidden onChange={event => chooseFile(event.target.files?.[0])} data-testid="input-menu-image" />{fileError && <div role="alert" className="notice" data-testid="error-menu-parser">{fileError}</div>}{parser.isPending && <div className="hint-box" role="status">{t.extracting}</div>}{parser.isError && !fileError && <div className="notice" role="alert">{t.parseError}</div>}</> : <><div className="hint-box">{t.parsedInfo}</div><strong className="section-caption">{t.reviewDrafts} · {drafts.length}</strong>{drafts.map((draft, index) => <div className="draft-row" key={index}><input aria-label={t.name} value={draft.name} onChange={event => setDrafts(current => current.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} data-testid={`input-draft-name-${index}`} /><input aria-label={t.price} type="number" min="0" step=".01" value={draft.price} onChange={event => setDrafts(current => current.map((row, i) => i === index ? { ...row, price: Number(event.target.value) } : row))} data-testid={`input-draft-price-${index}`} /><button className="small-action delete" onClick={() => setDrafts(current => current.filter((_, i) => i !== index))} aria-label={t.delete} data-testid={`button-remove-draft-${index}`}><X size={13} /></button><input aria-label={t.category} value={draft.category} onChange={event => setDrafts(current => current.map((row, i) => i === index ? { ...row, category: event.target.value } : row))} data-testid={`input-draft-category-${index}`} /><input aria-label={t.description} value={draft.description} onChange={event => setDrafts(current => current.map((row, i) => i === index ? { ...row, description: event.target.value } : row))} style={{ gridColumn: '2 / -1' }} data-testid={`input-draft-description-${index}`} /></div>)}{drafts.length === 0 && <div className="empty-state">{t.noDrafts}</div>}</>}
    </Modal>}
  </>;
}
function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) { return <div className={`form-field ${full ? 'full' : ''}`}><label>{label}{children}</label></div>; }

function OrdersPage({ data, setData, t, money, notify }: PageProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('dineIn');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const available = data.menu.filter(item => item.available);
  const nextStatus = (status: Order['status']): Order['status'] => status === 'new' ? 'preparing' : status === 'preparing' ? 'ready' : 'completed';
  const createOrder = (event: FormEvent) => {
    event.preventDefault();
    const items = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([menuItemId, quantity]) => {
      const item = data.menu.find(row => row.id === menuItemId)!;
      return { menuItemId, name: item.name, quantity, price: item.price };
    });
    if (!items.length) { setError(t.noItems); return; }
    const number = `#${1049 + data.orders.length}`;
    const order: Order = { id: id(), number, source, status: 'new', total: items.reduce((sum, item) => sum + item.price * item.quantity, 0), createdAt: new Date().toISOString(), items };
    setData(current => ({ ...current, orders: [order, ...current.orders] })); setOpen(false); setQuantities({}); setError(''); notify(t.orderCreated);
  };
  const remove = (order: Order) => {
    if (!window.confirm(t.confirmDelete)) return;
    setData(current => ({ ...current, orders: current.orders.filter(row => row.id !== order.id) })); notify(t.removed);
  };
  const sourceName = (value: string) => value === 'pickup' ? t.pickup : value === 'delivery' ? t.delivery : t.dineIn;
  return <>
    <PageHeader eyebrow={t.orders} title={t.ordersTitle} subtitle={t.ordersSub} action={<button className="btn" onClick={() => { setOpen(true); setError(''); }} data-testid="button-create-order"><Plus size={15} />{t.newOrder}</button>} />
    <div className="card table-card">
      {data.orders.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t.orderNumber}</th><th>{t.name}</th><th>{t.source}</th><th>{t.status}</th><th>{t.total}</th><th>{t.time}</th><th>{t.actions}</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id} data-testid={`row-order-${order.id}`}><td className="mono">{order.number}</td><td><div className="item-name">{order.items.map(item => `${item.name} ×${item.quantity}`).join(', ')}</div></td><td>{sourceName(order.source)}</td><td><span className={`pill ${order.status === 'ready' ? 'pill-cyan' : order.status === 'completed' ? 'pill-muted' : order.status === 'preparing' ? 'pill-orange' : 'pill-green'}`}>{statusLabel(order.status, t)}</span></td><td className="mono">{money(order.total)}</td><td className="item-detail">{timeAgo(order.createdAt, t === words.ar)}</td><td><div className="row-actions">{order.status !== 'completed' && <button className="small-action" onClick={() => setData(current => ({ ...current, orders: current.orders.map(row => row.id === order.id ? { ...row, status: nextStatus(row.status) } : row) }))} data-testid={`button-next-status-${order.id}`}>{t.nextStatus} <ArrowUpRight size={11} /></button>}<button className="small-action delete" onClick={() => remove(order)} aria-label={t.delete} data-testid={`button-delete-order-${order.id}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <Empty title={t.noOrders} text={t.noOrdersText} action={<button className="btn" onClick={() => setOpen(true)} data-testid="button-empty-create-order">{t.newOrder}</button>} />}
    </div>
    {open && <Modal title={t.newOrder} onClose={() => setOpen(false)} testId="create-order" footer={<><button className="btn btn-quiet" onClick={() => setOpen(false)} data-testid="button-cancel-order">{t.cancel}</button><button className="btn" form="order-form" type="submit" data-testid="button-submit-order"><Plus size={14} />{t.createOrder}</button></>}><form id="order-form" onSubmit={createOrder}>
      {!available.length ? <div className="notice">{t.noAvailableItems}</div> : <>
        <Field label={t.source}><select value={source} onChange={event => setSource(event.target.value)} data-testid="select-order-source"><option value="dineIn">{t.dineIn}</option><option value="pickup">{t.pickup}</option><option value="delivery">{t.delivery}</option></select></Field>
        <div style={{ marginTop: 17 }}><div className="section-caption" style={{ marginBottom: 8 }}>{t.addToOrder}</div>{available.map(item => <div className="order-line" key={item.id}><div><div className="order-name">{item.name}</div><div className="order-meta">{money(item.price)}</div></div><input aria-label={`${t.quantity} ${item.name}`} type="number" min="0" max="99" value={quantities[item.id] ?? 0} onChange={event => setQuantities(current => ({ ...current, [item.id]: Math.max(0, Number(event.target.value)) }))} style={{ width: 72 }} data-testid={`input-order-quantity-${item.id}`} /></div>)}</div>
        {error && <div role="alert" className="notice" data-testid="error-order-form">{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15 }}><span className="section-caption">{t.total}</span><strong className="mono">{money(Object.entries(quantities).reduce((sum, [itemId, quantity]) => sum + (data.menu.find(item => item.id === itemId)?.price ?? 0) * quantity, 0))}</strong></div>
      </>}
    </form></Modal>}
  </>;
}

function InventoryPage({ data, setData, t, money, notify }: PageProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', minQuantity: '', cost: '' });
  const begin = (item?: StockItem) => { setEditing(item ?? null); setForm(item ? { name: item.name, quantity: String(item.quantity), unit: item.unit, minQuantity: String(item.minQuantity), cost: String(item.cost) } : { name: '', quantity: '', unit: '', minQuantity: '', cost: '' }); setOpen(true); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const item: StockItem = { id: editing?.id ?? id(), name: form.name.trim(), quantity: Number(form.quantity), unit: form.unit.trim(), minQuantity: Number(form.minQuantity), cost: Number(form.cost) };
    if (!item.name || !item.unit || !Number.isFinite(item.quantity) || !Number.isFinite(item.minQuantity) || !Number.isFinite(item.cost)) return;
    setData(current => ({ ...current, stock: editing ? current.stock.map(row => row.id === editing.id ? item : row) : [item, ...current.stock] })); setOpen(false); notify(t.saved);
  };
  const remove = (item: StockItem) => { if (window.confirm(t.confirmDelete)) { setData(current => ({ ...current, stock: current.stock.filter(row => row.id !== item.id) })); notify(t.removed); } };
  const low = data.stock.filter(item => item.quantity <= item.minQuantity).length;
  return <>
    <PageHeader eyebrow={t.inventory} title={t.stockTitle} subtitle={t.stockSub} action={<button className="btn" onClick={() => begin()} data-testid="button-add-stock"><Plus size={15} />{t.addStock}</button>} />
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}><Stat title={t.stockItem} value={String(data.stock.length).padStart(2, '0')} foot={t.inventory} color="var(--cyan)" glow="rgba(84,232,223,.13)" icon={<Boxes size={17} />} /><Stat title={t.lowStock} value={String(low).padStart(2, '0')} foot={t.low} color="var(--orange)" glow="rgba(255,180,91,.13)" icon={<ArrowDownRight size={17} />} /><Stat title={t.unitCost} value={money(data.stock.reduce((sum, item) => sum + item.quantity * item.cost, 0))} foot={t.quantityOnHand} color="var(--pink)" glow="rgba(255,119,183,.12)" icon={<Package size={17} />} /></div>
    <div className="card table-card">{data.stock.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t.stockItem}</th><th>{t.quantityOnHand}</th><th>{t.minLevel}</th><th>{t.unitCost}</th><th>{t.availability}</th><th>{t.actions}</th></tr></thead><tbody>{data.stock.map(item => <tr key={item.id} data-testid={`row-stock-${item.id}`}><td><div className="item-name">{item.name}</div></td><td className="mono">{item.quantity} {item.unit}</td><td className="mono">{item.minQuantity} {item.unit}</td><td className="mono">{money(item.cost)}</td><td><span className={`pill ${item.quantity <= item.minQuantity ? 'pill-orange' : 'pill-green'}`}>{item.quantity <= item.minQuantity ? t.low : t.healthy}</span></td><td><div className="row-actions"><button className="small-action" onClick={() => begin(item)} aria-label={`${t.edit} ${item.name}`} data-testid={`button-edit-stock-${item.id}`}><Pencil size={13} /></button><button className="small-action delete" onClick={() => remove(item)} aria-label={t.delete} data-testid={`button-delete-stock-${item.id}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <Empty title={t.noStock} text={t.noStockText} action={<button className="btn" onClick={() => begin()} data-testid="button-empty-add-stock">{t.addStock}</button>} />}</div>
    {open && <Modal title={editing ? t.edit : t.addStock} onClose={() => setOpen(false)} testId="stock-item" footer={<><button className="btn btn-quiet" onClick={() => setOpen(false)} data-testid="button-cancel-stock">{t.cancel}</button><button className="btn" form="stock-form" type="submit" data-testid="button-save-stock">{editing ? t.update : t.add}</button></>}><form id="stock-form" className="form-grid" onSubmit={save}><Field label={t.name}><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} data-testid="input-stock-name" /></Field><Field label={t.unit}><input required placeholder={t.unit} value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} data-testid="input-stock-unit" /></Field><Field label={t.quantityOnHand}><input required type="number" min="0" step=".01" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} data-testid="input-stock-quantity" /></Field><Field label={t.minLevel}><input required type="number" min="0" step=".01" value={form.minQuantity} onChange={event => setForm({ ...form, minQuantity: event.target.value })} data-testid="input-stock-minimum" /></Field><Field label={t.unitCost}><input required type="number" min="0" step=".01" value={form.cost} onChange={event => setForm({ ...form, cost: event.target.value })} data-testid="input-stock-cost" /></Field></form></Modal>}
  </>;
}

function ExpensesPage({ data, setData, t, money, notify }: PageProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ title: '', category: '', amount: '', date: today });
  const filtered = data.expenses.filter(item => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  const total = data.expenses.filter(item => item.date === today).reduce((sum, item) => sum + item.amount, 0);
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.category.trim() || Number(form.amount) < 0) return;
    const expense: Expense = { id: id(), title: form.title.trim(), category: form.category.trim(), amount: Number(form.amount), date: form.date };
    setData(current => ({ ...current, expenses: [expense, ...current.expenses] })); setOpen(false); setForm({ title: '', category: '', amount: '', date: today }); notify(t.saved);
  };
  const remove = (expense: Expense) => { if (window.confirm(t.confirmDelete)) { setData(current => ({ ...current, expenses: current.expenses.filter(item => item.id !== expense.id) })); notify(t.removed); } };
  return <>
    <PageHeader eyebrow={t.expenses} title={t.costTitle} subtitle={t.costSub} action={<button className="btn" onClick={() => setOpen(true)} data-testid="button-add-expense"><Plus size={15} />{t.addExpense}</button>} />
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}><Stat title={t.expenseTotal} value={money(total)} foot={t.today} color="var(--pink)" glow="rgba(255,119,183,.13)" icon={<CircleDollarSign size={17} />} /><Stat title={t.expenses} value={String(data.expenses.length).padStart(2, '0')} foot={rtlCopy(t, 'بنود مسجلة', 'logged entries')} color="var(--cyan)" glow="rgba(84,232,223,.12)" icon={<Coffee size={17} />} /></div>
    <div className="card table-card"><div className="toolbar"><div className="search-field"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} data-testid="input-search-expenses" /></div><span className="section-caption">{filtered.length} {t.expenses}</span></div>
      {filtered.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t.expenseTitle}</th><th>{t.expenseCategory}</th><th>{t.date}</th><th>{t.amount}</th><th>{t.actions}</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} data-testid={`row-expense-${item.id}`}><td><div className="item-name">{item.title}</div></td><td><span className="pill pill-muted">{item.category}</span></td><td className="mono">{item.date}</td><td className="mono">{money(item.amount)}</td><td><div className="row-actions"><button className="small-action delete" onClick={() => remove(item)} aria-label={`${t.delete} ${item.title}`} data-testid={`button-delete-expense-${item.id}`}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <Empty title={t.noExpenses} text={t.noExpensesText} action={<button className="btn" onClick={() => setOpen(true)} data-testid="button-empty-add-expense">{t.addExpense}</button>} />}</div>
    {open && <Modal title={t.addExpense} onClose={() => setOpen(false)} testId="expense" footer={<><button className="btn btn-quiet" onClick={() => setOpen(false)} data-testid="button-cancel-expense">{t.cancel}</button><button className="btn" type="submit" form="expense-form" data-testid="button-save-expense">{t.add}</button></>}><form id="expense-form" className="form-grid" onSubmit={save}><Field label={t.expenseTitle} full><input required autoFocus value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} data-testid="input-expense-title" /></Field><Field label={t.expenseCategory}><input required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder={rtlCopy(t, 'مشتريات، رواتب، مرافق', 'Supplies, payroll, utilities')} data-testid="input-expense-category" /></Field><Field label={t.amount}><input required type="number" min="0" step=".01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} data-testid="input-expense-amount" /></Field><Field label={t.date}><input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} data-testid="input-expense-date" /></Field></form></Modal>}
  </>;
}
function rtlCopy(t: PageProps['t'], ar: string, en: string) { return t === words.ar ? ar : en; }

function SettingsPage({ data, setData, t, rtl, notify }: Omit<PageProps, 'money'> & { rtl: boolean }) {
  const chooseLanguage = (language: StoreData['language']) => { setData(current => ({ ...current, language })); notify(language === 'ar' ? 'تم تغيير اللغة' : 'Language updated'); };
  const chooseCurrency = (currency: string) => { setData(current => ({ ...current, currency })); notify(t.saved); };
  return <>
    <PageHeader eyebrow={t.settings} title={t.settings} subtitle={rtl ? 'اجعل مساحة العمل مناسبة لفريقك.' : 'Make the workspace work for your team.'} />
    <div className="settings-grid">
      <section className="card settings-card"><div className="section-title">{rtl ? 'التفضيلات' : 'Preferences'}</div><div className="section-caption" style={{ marginTop: 5 }}>{rtl ? 'إعدادات واجهة Neon' : 'Neon workspace settings'}</div>
        <div className="setting-row"><div><div className="setting-label">{t.language}</div><div className="setting-description">{t.langDesc}</div></div><div style={{ display: 'flex', gap: 6 }}><button className={`currency-choice ${data.language === 'ar' ? 'selected' : ''}`} onClick={() => chooseLanguage('ar')} data-testid="button-language-ar">{t.arabic}</button><button className={`currency-choice ${data.language === 'en' ? 'selected' : ''}`} onClick={() => chooseLanguage('en')} data-testid="button-language-en">{t.english}</button></div></div>
        <div className="setting-row"><div><div className="setting-label">{t.currency}</div><div className="setting-description">{t.currencyDesc}</div></div><div className="currency-grid">{['SAR', 'AED', 'USD', 'EUR', 'EGP'].map(currency => <button key={currency} className={`currency-choice ${data.currency === currency ? 'selected' : ''}`} onClick={() => chooseCurrency(currency)} data-testid={`button-currency-${currency}`}>{currency}</button>)}</div></div>
        <div className="setting-row"><div><div className="setting-label">{rtl ? 'اتجاه العرض' : 'Layout direction'}</div><div className="setting-description">{rtl ? 'يتغير تلقائياً حسب لغة الواجهة' : 'Follows the selected language automatically'}</div></div><span className="pill pill-cyan">{rtl ? 'RTL' : 'LTR'}</span></div>
      </section>
      <aside className="card settings-card"><div className="empty-icon" style={{ marginInlineStart: 0 }}><Package size={19} /></div><div className="section-title">{t.dataInfo}</div><p className="section-caption" style={{ lineHeight: 1.7, marginTop: 9 }}>{t.dataDesc}</p><div className="hint-box" style={{ marginTop: 18 }}>{rtl ? 'ابدأ مباشرة — لا يوجد تسجيل دخول أو إعداد خادم.' : 'Start right away — no account or server setup needed.'}</div><div className="section-caption">{rtl ? `أصناف القائمة: ${data.menu.length} · الطلبات: ${data.orders.length}` : `Menu items: ${data.menu.length} · Orders: ${data.orders.length}`}</div></aside>
    </div>
  </>;
}
function statusLabel(status: Order['status'], t: PageProps['t']) { return t[status]; }
function timeAgo(date: string, rtl: boolean) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 1) return rtl ? 'الآن' : 'Just now';
  if (mins < 60) return rtl ? `قبل ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return rtl ? `قبل ${hours} س` : `${hours}h ago`;
}

export default function Root() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><App /></WouterRouter></QueryClientProvider>;
}
