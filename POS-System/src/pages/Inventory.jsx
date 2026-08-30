import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Edit3, Trash2, Filter, Download, Box, AlertCircle, Calendar, Hash, X, RefreshCw, Layers, History, TrendingUp, ShoppingBag, ArrowUpCircle } from 'lucide-react';
import { db } from '../database';
import { addItem, editItem, deleteItem } from '../store/slices/inventorySlice';
import Barcode from 'react-barcode';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { addToSyncQueue } from '../utils/offlineSync';
import doneSound from '../assets/Done.ogg';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const Inventory = () => {
    const playDone = () => {
        try {
            const audio = new Audio(doneSound);
            audio.play().catch(e => console.log("Audio blocked"));
        } catch (e) { console.error(e); }
    };
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const inventory = useSelector(state => state.inventory.items);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 100;
    const [nameSuggestion, setNameSuggestion] = useState('');
    const [mfrSuggestion, setMfrSuggestion] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedManufacturer, setSelectedManufacturer] = useState('All Companies');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [restockItem, setRestockItem] = useState(null);
    const [auditItem, setAuditItem] = useState(null);
    const [restockQty, setRestockQty] = useState('');
    const [restockBuyPrice, setRestockBuyPrice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- NEW: Price Check / Quick Price Update state ---
    const [showPriceCheck, setShowPriceCheck] = useState(false);
    const [priceCheckTerm, setPriceCheckTerm] = useState('');
    const [priceCheckItem, setPriceCheckItem] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [editWholesale, setEditWholesale] = useState('');
    const [isPriceSaving, setIsPriceSaving] = useState(false);
    // --- NEW: Product Ledger (sales movements) state ---
    const [ledgerSales, setLedgerSales] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '', price: '', wholesale_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Product', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: '', sell_type: 'piece', image: ''
    });

    const categories = ['Sweets', 'Bakery', 'Beverages', 'Snacks', 'Dairy', 'Grocery', 'Frozen', 'Household', 'Dry Fruits', 'Other'];

    const manufacturers = React.useMemo(() => {
        const unique = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))];
        return unique.sort();
    }, [inventory]);

    // useMemo: only re-filter when the data or search/filter actually changes,
    // instead of rebuilding the whole filtered array on every single render
    // (that churn kept memory high and never settled).
    const filteredItems = React.useMemo(() => {
        const q = searchTerm.toLowerCase();
        return inventory.filter(item => {
            const matchesSearch =
                item.name?.toLowerCase().includes(q) ||
                (item.id && String(item.id).includes(searchTerm)) ||
                (item.barcode && String(item.barcode).includes(searchTerm)) ||
                (item.manufacturer && item.manufacturer.toLowerCase().includes(q)) ||
                (item.batch_no && item.batch_no.toLowerCase().includes(q));
            const matchesCat = selectedCategory === 'All Categories' || item.category === selectedCategory;
            const matchesMan = selectedManufacturer === 'All Companies' || item.manufacturer === selectedManufacturer;
            return matchesSearch && matchesCat && matchesMan;
        });
    }, [inventory, searchTerm, selectedCategory, selectedManufacturer]);

    // PAGINATION: only render PAGE_SIZE rows at a time.
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedItems = React.useMemo(
        () => filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filteredItems, safePage]
    );

    // When search/filter changes, jump back to page 1
    React.useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, selectedManufacturer]);

    // GHOST AUTOCOMPLETE FOR ENROLLMENT
    React.useEffect(() => {
        if (isModalOpen && formData.name && formData.name.length >= 2) {
            const match = inventory.find(i => i.name?.toLowerCase().startsWith(formData.name.toLowerCase()));
            if (match) setNameSuggestion(match.name);
            else setNameSuggestion('');
        } else {
            setNameSuggestion('');
        }
    }, [formData.name, inventory, isModalOpen]);

    React.useEffect(() => {
        if (isModalOpen && formData.manufacturer && formData.manufacturer.length >= 2) {
            const mfrs = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))];
            const match = mfrs.find(m => m.toLowerCase().startsWith(formData.manufacturer.toLowerCase()));
            if (match) setMfrSuggestion(match);
            else setMfrSuggestion('');
        } else {
            setMfrSuggestion('');
        }
    }, [formData.manufacturer, inventory, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);

        // Use parseFloat so weight products (kg) can carry decimals like 0.5;
        // parseFloat("5") === 5 so piece products are unaffected.
        const initialStockValue = parseFloat(formData.stock);
        const data = {
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            sell_type: formData.sell_type || 'piece',
            barcode: formData.barcode || null,
            price: parseFloat(formData.price),
            wholesale_price: parseFloat(formData.wholesale_price || formData.price),
            buy_price: parseFloat(formData.buy_price || 0),
            stock: initialStockValue,
            min_stock: parseInt(formData.min_stock || 5),
            expiry: formData.expiry || null,
            critical_days: parseInt(formData.critical_days || 60),
            manufacturer: formData.manufacturer || '',
            batch_no: formData.batch_no || '',
            image: formData.image || null,
            initial_stock: editingItem ? editingItem.initial_stock : initialStockValue,
            total_sold: editingItem ? editingItem.total_sold : 0
        };

        const tempId = editingItem ? editingItem.id : Date.now().toString();
        const optimisticData = { ...data, id: tempId };

        try {
            if (editingItem) {
                dispatch(editItem(optimisticData));
                const { error } = await db.from('inventory').update(data).eq('id', editingItem.id);
                if (error) addToSyncQueue('inventory', 'update', data, editingItem.id);
                else toast.success('Synced to Cloud');
            } else {
                // Show the item instantly with a temp id...
                dispatch(addItem(optimisticData));
                // ...then replace it with the REAL row from the DB (which has the
                // real UUID). Without this the new item kept a fake Date.now() id,
                // so editing/deleting/restocking it before a reload would fail.
                const { data: saved, error } = await db
                    .from('inventory')
                    .insert([data])
                    .select()
                    .single();
                if (error) {
                    addToSyncQueue('inventory', 'insert', data);
                } else {
                    dispatch(deleteItem(tempId));   // remove the temp entry
                    dispatch(addItem(saved));       // add the real one
                    toast.success('Synced to Cloud');
                }
            }

            playDone();
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ name: '', price: '', wholesale_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Product', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: '', sell_type: 'piece', image: '' });
        } catch (err) {
            console.error(err);
            toast.success("Saved Locally (Offline Mode)");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!isAdmin) {
            toast.error("Only Admins can move products to Trash.");
            return;
        }
        if (window.confirm('Move this product to Trash? It will be permanently deleted after 30 days.')) {
            try {
                const { error } = await db.from('inventory').update({ deleted_at: new Date().toISOString() }).eq('id', id);
                if (error) throw error;
                dispatch(deleteItem(id));
                toast.success('Product moved to Trash');
            } catch (err) {
                toast.error("Cloud Move to Trash Failed.");
            }
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name, price: item.price, wholesale_price: item.wholesale_price || item.price || '',
            buy_price: item.buy_price || '', stock: item.stock, unit: item.unit || 'Units',
            category: item.category || 'Product', min_stock: item.min_stock || 5,
            expiry: item.expiry || '', tax_percent: item.tax_percent || 0,
            barcode: item.barcode || '', critical_days: item.critical_days || 60,
            manufacturer: item.manufacturer || '', batch_no: item.batch_no || '',
            sell_type: item.sell_type || 'piece', image: item.image || ''
        });
        setIsModalOpen(true);
    };

    const handleRestock = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        const incomingQty = parseFloat(restockQty);
        const incomingBuyPrice = parseFloat(restockBuyPrice);

        if (isNaN(incomingQty) || isNaN(incomingBuyPrice)) {
            toast.error("Please enter valid numbers");
            setIsSaving(false);
            return;
        }

        const currentStock = parseFloat(restockItem.stock || 0);
        const currentBuyPrice = parseFloat(restockItem.buy_price || 0);
        const totalStock = currentStock + incomingQty;
        const averageBuyPrice = ((currentStock * currentBuyPrice) + (incomingQty * incomingBuyPrice)) / totalStock;

        const newHistoryEntry = {
            date: new Date().toISOString(),
            quantity: incomingQty,
            prev_stock: currentStock,
            new_stock: totalStock,
            buy_price: incomingBuyPrice
        };

        const updatedHistory = [newHistoryEntry, ...(restockItem.restock_history || [])];

        const updatedData = {
            stock: totalStock,
            buy_price: parseFloat(averageBuyPrice.toFixed(2)),
            restock_history: updatedHistory
        };

        dispatch(editItem({ ...restockItem, ...updatedData }));
        try {
            const { error } = await db.from('inventory').update(updatedData).eq('id', restockItem.id);
            if (error) throw error;
            playDone();
            toast.success(`Restocked! New Avg Cost: Rs ${averageBuyPrice.toFixed(2)}`);
        } catch (err) {
            addToSyncQueue('inventory', 'update', updatedData, restockItem.id);
            toast.success("Saved Locally (Restock)");
        } finally {
            setIsSaving(false);
            setIsRestockModalOpen(false);
            setRestockQty('');
            setRestockBuyPrice('');
        }
    };

    const openRestock = (item) => {
        setRestockItem(item);
        setRestockBuyPrice(item.buy_price || '');
        setIsRestockModalOpen(true);
    };

    const openAudit = (item) => {
        setAuditItem(item);
        setIsAuditModalOpen(true);
    };

    // ---- NEW: PRICE CHECK / QUICK PRICE UPDATE ----
    const loadPriceCheckItem = (item) => {
        setPriceCheckItem(item || null);
        if (item) {
            setEditPrice(item.price != null ? String(item.price) : '');
            setEditWholesale(item.wholesale_price != null ? String(item.wholesale_price) : (item.price != null ? String(item.price) : ''));
        } else {
            setEditPrice('');
            setEditWholesale('');
        }
    };

    // Open Price Check modal; optionally preloaded with a product (from row quick-price button)
    const openPriceCheck = (item) => {
        if (item) {
            setPriceCheckTerm(item.name || '');
            loadPriceCheckItem(item);
        } else {
            setPriceCheckTerm('');
            loadPriceCheckItem(null);
        }
        setShowPriceCheck(true);
    };

    // Live match as the user types / scans in the price-check input
    React.useEffect(() => {
        if (!showPriceCheck) return;
        const term = (priceCheckTerm || '').trim().toLowerCase();
        if (!term) { loadPriceCheckItem(null); return; }
        const exact = inventory.find(i =>
            (i.barcode && i.barcode.toLowerCase() === term) ||
            (i.id && String(i.id).toLowerCase() === term)
        );
        const match = exact || inventory.find(i =>
            (i.name && i.name.toLowerCase().includes(term)) ||
            (i.barcode && i.barcode.toLowerCase().includes(term)) ||
            (i.id && String(i.id).toLowerCase().includes(term))
        );
        loadPriceCheckItem(match || null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [priceCheckTerm, showPriceCheck, inventory]);

    // Enter on price-check input -> lock exact barcode/id match if present
    const handlePriceCheckKey = (e) => {
        if (e.key !== 'Enter') return;
        const term = (priceCheckTerm || '').trim().toLowerCase();
        if (!term) return;
        const exact = inventory.find(i =>
            (i.barcode && i.barcode.toLowerCase() === term) ||
            (i.id && String(i.id).toLowerCase() === term)
        );
        if (exact) loadPriceCheckItem(exact);
    };

    const handleQuickPriceSave = async () => {
        if (!priceCheckItem) return;
        if (isPriceSaving) return;
        const price = parseFloat(editPrice);
        const wholesale_price = parseFloat(editWholesale || editPrice);
        if (isNaN(price)) { toast.error('Enter a valid sale price'); return; }
        setIsPriceSaving(true);
        const updated = { ...priceCheckItem, price, wholesale_price };
        dispatch(editItem(updated));
        setPriceCheckItem(updated);
        try {
            const { error } = await db.from('inventory').update({ price, wholesale_price, sale_price: price }).eq('id', priceCheckItem.id);
            if (error) throw error;
            playDone();
            toast.success('Price updated!');
        } catch (err) {
            addToSyncQueue('inventory', 'update', { price, wholesale_price, sale_price: price }, priceCheckItem.id);
            toast.success('Saved Locally (Price)');
        } finally {
            setIsPriceSaving(false);
        }
    };

    // ---- NEW: PRINT BARCODE ----
    const [printBarcodeItem, setPrintBarcodeItem] = useState(null);
    const [printCopies, setPrintCopies] = useState(1);
    const printBarcodeRef = React.useRef(null);

    const handlePrintBarcode = (item) => {
        if (!item || !item.barcode) {
            toast.error('No barcode — pehle Generate karein');
            return;
        }
        setPrintBarcodeItem(item);
    };

    // When a barcode is queued for printing, wait for the hidden <Barcode> to
    // render its real (scannable) SVG, grab it, and open a clean print window.
    React.useEffect(() => {
        if (!printBarcodeItem) return;
        const t = setTimeout(() => {
            try {
                const svgEl = printBarcodeRef.current && printBarcodeRef.current.querySelector('svg');
                const svgMarkup = svgEl ? svgEl.outerHTML : '';
                const item = printBarcodeItem;
                const priceStr = `Rs ${(item.price || 0).toLocaleString()}${item.sell_type === 'weight' ? '/kg' : ''}`;
                const safe = (x) => String(x == null ? '' : x).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
                const copies = Math.max(1, parseInt(printCopies) || 1);
                let labels = '';
                for (let i = 0; i < copies; i++) {
                    labels += `<div class="label">
                        <div class="store">TEHZEEB SWEETS & SUPER STORE</div>
                        <div class="name">${safe(item.name)}</div>
                        <div class="bc">${svgMarkup}</div>
                        <div class="price">${safe(priceStr)}</div>
                    </div>`;
                }
                const win = window.open('', '_blank', 'width=480,height=360');
                if (!win) { toast.error('Popup blocked — allow popups to print'); setPrintBarcodeItem(null); return; }
                win.document.write(`<!doctype html><html><head><title>Barcode - ${safe(item.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 8px; }
  .label { width: 200px; text-align: center; padding: 6px 8px; margin: 0 auto 10px; page-break-inside: avoid; }
  .store { font-size: 8px; font-weight: 700; color: #444; letter-spacing: .2px; }
  .name { font-size: 12px; font-weight: 800; color: #000; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bc svg { width: 100%; height: 55px; }
  .price { font-size: 14px; font-weight: 900; color: #000; margin-top: 2px; }
  @media print { body { padding: 0; } .label { margin: 0 auto; } }
</style></head><body>
  ${labels}
  <script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>
</body></html>`);
                win.document.close();
            } catch (e) {
                toast.error('Print failed');
            } finally {
                setPrintBarcodeItem(null);
            }
        }, 120);
        return () => clearTimeout(t);
    }, [printBarcodeItem, printCopies]);

    // ---- NEW: PRODUCT LEDGER — load sales movements when audit opens ----
    React.useEffect(() => {
        let cancelled = false;
        const loadLedger = async () => {
            if (!isAuditModalOpen || !auditItem) { setLedgerSales([]); return; }
            setLedgerLoading(true);
            try {
                const { data, error } = await db.from('sale_items').select('*');
                if (error) throw error;
                const rows = (data || []).filter(r =>
                    (r.product_id != null && String(r.product_id) === String(auditItem.id)) ||
                    (r.name && auditItem.name && r.name.toLowerCase() === auditItem.name.toLowerCase())
                );
                rows.sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
                if (!cancelled) setLedgerSales(rows);
            } catch (err) {
                if (!cancelled) setLedgerSales([]);
            } finally {
                if (!cancelled) setLedgerLoading(false);
            }
        };
        loadLedger();
        return () => { cancelled = true; };
    }, [isAuditModalOpen, auditItem]);

    const handleExport = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Store Inventory');

        worksheet.columns = [
            { header: 'Product Name', key: 'name', width: 35 },
            { header: 'Manufacturer', key: 'manufacturer', width: 25 },
            { header: 'Batch No', key: 'batch_no', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Unit', key: 'unit', width: 12 },
            { header: 'Retail Price', key: 'price', width: 15 },
            { header: 'Wholesale Price', key: 'wholesale_price', width: 15 },
            { header: 'Purchase Price', key: 'buy_price', width: 15 },
            { header: 'Stock', key: 'stock', width: 12 },
            { header: 'Min Alert Qty', key: 'min_stock', width: 15 },
            { header: 'Expiry', key: 'expiry', width: 20 },
            { header: 'Barcode', key: 'barcode', width: 20 },
            { header: 'Total Value (AUTO)', key: 'total_value', width: 20 }
        ];

        const headerColors = {
            'name': 'FF059669', 'manufacturer': 'FF059669', 'batch_no': 'FF059669',
            'category': 'FF0369A1', 'unit': 'FF0369A1',
            'price': 'FF0D9488', 'wholesale_price': 'FF4F46E5', 'buy_price': 'FFBE123C',
            'stock': 'FF1E293B', 'min_stock': 'FF1E293B', 'expiry': 'FF1E293B',
            'barcode': 'FF1E293B', 'total_value': 'FFD97706'
        };

        const headerRow = worksheet.getRow(1);
        headerRow.height = 35;
        headerRow.eachCell((cell, colNumber) => {
            const key = worksheet.columns[colNumber - 1].key;
            cell.font = { name: 'Segoe UI', color: { argb: 'FFFFFFFF' }, size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[key] || 'FF64748B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        inventory.forEach((item, idx) => {
            const rowIndex = idx + 2;
            const row = worksheet.addRow({
                name: item.name,
                manufacturer: item.manufacturer || '-',
                batch_no: item.batch_no || '-',
                category: item.category?.toUpperCase(),
                unit: item.unit,
                price: item.price,
                wholesale_price: item.wholesale_price || item.price,
                buy_price: item.buy_price || 0,
                stock: item.stock,
                min_stock: item.min_stock || 5,
                expiry: item.expiry || '-',
                barcode: item.barcode || '-'
            });

            // Add formula for each row
            worksheet.getCell(`O${rowIndex}`).value = { formula: `I${rowIndex}*H${rowIndex}` };
            worksheet.getCell(`O${rowIndex}`).numFmt = '"Rs "#,##0.00';
            worksheet.getCell(`O${rowIndex}`).font = { bold: true, color: { argb: 'FFB45309' } };

            row.height = 25;
            row.eachCell((cell) => {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Tehzeeb_Full_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        toast.success("Premium Inventory Exported!");
    };

    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory Template');

        // 1. Define Columns with proper widths
        worksheet.columns = [
            { header: 'Product Name', key: 'name', width: 35 },
            { header: 'Manufacturer', key: 'manufacturer', width: 25 },
            { header: 'Batch No', key: 'batch_no', width: 15 },
            { header: 'Category (Select from Dropdown)', key: 'category', width: 25 },
            { header: 'Unit', key: 'unit', width: 12 },
            { header: 'Retail Price', key: 'price', width: 15 },
            { header: 'Wholesale Price', key: 'wholesale_price', width: 15 },
            { header: 'Purchase Price', key: 'buy_price', width: 15 },
            { header: 'Stock', key: 'stock', width: 12 },
            { header: 'Min Alert Qty', key: 'min_stock', width: 15 },
            { header: 'Expiry (YYYY-MM-DD)', key: 'expiry', width: 20 },
            { header: 'Barcode', key: 'barcode', width: 20 },
            { header: 'Total Value (AUTO)', key: 'total_value', width: 20 }
        ];

        // 2. Style Header Row (Multi-Color Branding)
        const headerRow = worksheet.getRow(1);
        headerRow.height = 35;

        const headerColors = {
            'name': 'FF059669', 'manufacturer': 'FF059669', 'batch_no': 'FF059669',
            'category': 'FF0369A1', 'unit': 'FF0369A1',
            'price': 'FF0D9488', 'wholesale_price': 'FF4F46E5', 'buy_price': 'FFBE123C',
            'stock': 'FF1E293B', 'min_stock': 'FF1E293B', 'expiry': 'FF1E293B',
            'barcode': 'FF1E293B', 'total_value': 'FFD97706'
        };

        headerRow.eachCell((cell, colNumber) => {
            const key = worksheet.columns[colNumber - 1].key;
            cell.font = { name: 'Segoe UI', color: { argb: 'FFFFFFFF' }, size: 10, bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerColors[key] || 'FF64748B' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 3. Add Data Validation (Dropdowns)
        const categoryOptions = ['Sweets', 'Bakery', 'Beverages', 'Snacks', 'Dairy', 'Grocery', 'Frozen', 'Household', 'Dry Fruits', 'Other'];
        const unitOptions = ['PCS', 'Pack', 'Dozen', 'Bottle', 'Box', 'Kg', 'Gram', 'Litre', 'ML', 'Bag'];

        for (let i = 2; i <= 500; i++) {
            // Category Dropdown
            worksheet.getCell(`D${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${categoryOptions.join(',')}"`]
            };

            // Unit Dropdown
            worksheet.getCell(`E${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${unitOptions.join(',')}"`]
            };

            // Add Formula for Total Value
            worksheet.getCell(`O${i}`).value = { formula: `I${i}*H${i}` };
            worksheet.getCell(`O${i}`).numFmt = '"Rs "#,##0.00';
            worksheet.getCell(`O${i}`).font = { bold: true, color: { argb: 'FFB45309' } };
        }

        // 4. Add Sample Rows with formatting
        const sampleRows = [
            {
                name: 'Barfi (per kg)',
                manufacturer: 'GSK',
                batch_no: 'AUG-786',
                category: 'Sweets',
                unit: 'Pack',
                price: 1200,
                wholesale_price: 1100,
                buy_price: 950,
                stock: 50,
                min_stock: 5,
                expiry: '2026-10-15',
                barcode: '501234567890'
            },
            {
                name: 'Fresh Cream Cake',
                manufacturer: 'Zoetis',
                batch_no: 'VAC-22',
                category: 'Bakery',
                unit: 'Vial',
                price: 3500,
                wholesale_price: 3200,
                buy_price: 2800,
                stock: 20,
                min_stock: 2,
                expiry: '2025-05-20',
                barcode: '998877665544'
            }
        ];

        sampleRows.forEach((row, idx) => {
            const addedRow = worksheet.addRow(row);
            addedRow.height = 25;
            addedRow.eachCell((cell) => {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
        });

        // 5. Generate & Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Tehzeeb_Inventory_Template.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);

        toast.success("Premium Excel Template Downloaded!");
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const dataArray = new Uint8Array(evt.target.result);
                const wb = XLSX.read(dataArray, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });

                // Filter out empty rows (where name is missing or blank)
                const data = rawData.filter(row => row['Product Name'] && row['Product Name'].toString().trim().length > 0);

                if (data.length === 0) {
                    toast.error("File is empty!");
                    return;
                }

                setIsSaving(true);
                const importToast = toast.loading(`Analyzing ${data.length} products...`);

                const formattedData = data.map(row => {
                    let rawExpiry = row['Expiry (YYYY-MM-DD)'];
                    let finalExpiry = null;

                    if (rawExpiry) {
                        const dateObj = new Date(rawExpiry);
                        if (!isNaN(dateObj.getTime())) {
                            finalExpiry = dateObj.toISOString().split('T')[0];
                        }
                    }

                    return {
                        name: row['Product Name'] || 'Unknown Product',
                        manufacturer: row['Manufacturer'] || '',
                        batch_no: row['Batch No'] || '',
                        category: row['Category (Select from Dropdown)'] || row['Category'] || 'Product',
                        unit: row['Unit'] || 'Units',
                        price: parseFloat(row['Retail Price'] || 0),
                        wholesale_price: parseFloat(row['Wholesale Price'] || row['Retail Price'] || 0),
                        buy_price: parseFloat(row['Purchase Price'] || 0),
                        stock: parseInt(row['Stock'] || 0),
                        min_stock: parseInt(row['Min Alert Qty'] || 5),
                        expiry: finalExpiry,
                        barcode: row['Barcode']?.toString() || null,
                        initial_stock: parseInt(row['Stock'] || 0),
                        total_sold: 0
                    };
                });

                // Smart Upsert Logic: Match by Name and Batch No
                const { data: existingItems } = await db.from('inventory').select('id, name, batch_no, initial_stock, total_sold');

                const finalUpsertData = formattedData.map(newItem => {
                    const match = existingItems?.find(old =>
                        old.name.trim().toLowerCase() === newItem.name.trim().toLowerCase() &&
                        (old.batch_no || '').trim().toLowerCase() === (newItem.batch_no || '').trim().toLowerCase()
                    );

                    if (match) {
                        return {
                            ...newItem,
                            id: match.id,
                            initial_stock: match.initial_stock || newItem.initial_stock, // Keep old if exists
                            total_sold: match.total_sold || 0 // Preserve sales history
                        };
                    }
                    return newItem; // Insert new
                });

                // Hybrid Bulk Smart Save (Bulk with Individual Fallback)
                let successCount = 0;
                let failCount = 0;
                const chunkSize = 50;

                for (let i = 0; i < finalUpsertData.length; i += chunkSize) {
                    const chunk = finalUpsertData.slice(i, i + chunkSize);
                    toast.loading(`Importing: ${i} / ${data.length} products...`, { id: importToast });

                    // 1. Try Bulk Upsert (Fastest)
                    const { error: bulkError } = await db.from('inventory').upsert(chunk);

                    if (!bulkError) {
                        successCount += chunk.length;
                    } else {
                        // 2. Fallback to Individual (Robust) if bulk fails
                        console.warn("Bulk chunk failed, falling back to individual processing for this chunk...", bulkError);
                        for (const item of chunk) {
                            try {
                                if (item.id) {
                                    const { error: upError } = await db.from('inventory').update(item).eq('id', item.id);
                                    if (upError) throw upError;
                                } else {
                                    const { error: inError } = await db.from('inventory').insert([item]);
                                    if (inError) throw inError;
                                }
                                successCount++;
                            } catch (err) {
                                console.error(`Individual save failed for: ${item.name}`, err);
                                failCount++;
                            }
                        }
                    }
                }

                toast.dismiss(importToast);
                if (failCount === 0) {
                    toast.success(`Success! ${successCount} products imported.`);
                } else {
                    toast.success(`${successCount} imported, ${failCount} failed. Check console for details.`);
                }

                setIsImportModalOpen(false);
                window.location.reload();
            } catch (err) {
                console.error("Critical Import Error:", err);
                toast.error("Critical Error during import processing.");
            } finally {
                setIsSaving(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: window.innerWidth <= 480 ? '10px' : '15px',
            overflow: 'hidden',
            backgroundColor: '#f0f4f8',
            padding: window.innerWidth <= 480 ? '10px' : '0'
        }}>

            {/* 1. PROFESSIONAL HEADER */}
            <header style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
                background: 'white',
                padding: window.innerWidth <= 480 ? '15px' : '15px 20px',
                borderBottom: '3px solid #F7941D',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.4rem', fontWeight: 900, color: '#8B2500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Box size={window.innerWidth <= 480 ? 20 : 24} color="#FF8A1E" /> STORE INVENTORY
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Real-time stock monitoring & control.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openPriceCheck(null)} className="btn-erp" style={{ flex: 1, background: 'linear-gradient(135deg, #F9C50D 0%, #F7941D 100%)', color: '#7A1E0C', border: '1px solid #F7941D', padding: '10px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>
                        <Search size={14} /> PRICE CHECK
                    </button>
                    <button onClick={() => setIsImportModalOpen(true)} className="btn-erp" style={{ flex: 1, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <ArrowUpCircle size={14} /> IMPORT
                    </button>
                    <button onClick={handleExport} className="btn-erp" style={{ flex: 1, background: '#f8fafc', color: '#64748b', padding: '10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <Download size={14} /> EXPORT
                    </button>
                    <button className="btn-erp" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ flex: 2, background: '#FF8A1E', color: 'white', padding: '10px 15px', fontWeight: 800, fontSize: '0.75rem' }}><Plus size={16} /> ADD PRODUCT</button>
                </div>
            </header>

            {/* 2. SEARCH & FILTER BAR */}
            <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row',
                gap: '12px',
                alignItems: window.innerWidth <= 1024 ? 'stretch' : 'center'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#FF8A1E' }} />
                    <input
                        type="text"
                        placeholder="Search by Name, Category, or SKU..."
                        style={{ width: '100%', padding: '10px 15px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: '#f8fafc' }} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option>All Categories</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: '#f0f9ff', color: '#0369a1' }} value={selectedManufacturer} onChange={e => setSelectedManufacturer(e.target.value)}>
                        <option>All Companies</option>
                        {manufacturers.map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* 3. INVENTORY DISPLAY */}
            <div style={{
                flex: 1,
                background: window.innerWidth <= 768 ? 'transparent' : 'white',
                border: window.innerWidth <= 768 ? 'none' : '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: window.innerWidth <= 768 ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}>
                <div style={{ overflowY: 'auto', height: '100%', paddingBottom: window.innerWidth <= 768 ? '20px' : '0' }}>
                    {window.innerWidth > 768 ? (
                        <table className="erp-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#8B2500', color: 'white' }}>
                                <tr>
                                    <th style={{ padding: '15px 20px' }}>BARCODE</th>
                                    <th style={{ padding: '15px 20px' }}>DESCRIPTION</th>
                                    <th style={{ padding: '15px 20px' }}>CATEGORY</th>
                                    <th style={{ padding: '15px 20px' }}>STOCK</th>
                                    {isAdmin && <th style={{ padding: '15px 20px' }}>PURCHASE</th>}
                                    <th style={{ padding: '15px 20px' }}>RETAIL</th>
                                    {isAdmin && <th style={{ padding: '15px 20px' }}>WHOLESALE</th>}
                                    <th style={{ padding: '15px 20px' }}>EXPIRY</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedItems.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px 20px' }}>
                                            {item.barcode
                                                ? <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 800, color: '#334155', letterSpacing: '0.05em' }}>{item.barcode}</span>
                                                : <span style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>NO BARCODE</span>}
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {item.name}
                                                {item.sell_type === 'weight' && <span style={{ fontSize: '0.55rem', fontWeight: 950, padding: '2px 6px', background: '#F7941D', color: 'white', borderRadius: '4px', letterSpacing: '0.04em' }}>BY WEIGHT</span>}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                                                <span>Unit: {item.sell_type === 'weight' ? 'kg' : item.unit}</span>
                                                {item.batch_no && <span style={{ color: '#ef4444', fontWeight: 900 }}>• BATCH: {item.batch_no}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 20px' }}><span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 8px', background: '#FFF7E6', borderRadius: '4px', color: '#D2691E' }}>{item.category?.toUpperCase()}</span></td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 950, color: item.stock <= (item.min_stock || 5) ? '#ef4444' : '#1e293b' }}>{item.sell_type === 'weight' ? `${item.stock} kg` : item.stock}</span>
                                                {item.stock <= (item.min_stock || 5) && <AlertCircle size={14} color="#ef4444" />}
                                            </div>
                                        </td>
                                        {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#64748b' }}>Rs {item.buy_price || 0}</td>}
                                        <td style={{ padding: '15px 20px', fontWeight: 900, color: '#F7941D', fontSize: '1.1rem' }}>Rs {(item.price || 0).toLocaleString()}{item.sell_type === 'weight' ? '/kg' : ''}</td>
                                        {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#6366f1' }}>Rs {(item.wholesale_price || item.price || 0).toLocaleString()}{item.sell_type === 'weight' ? '/kg' : ''}</td>}
                                        <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{item.expiry || '-'}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => openPriceCheck(item)} title="Quick price update" style={{ background: '#FFFBEA', border: '1px solid #F9C50D', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#D2691E' }}><TrendingUp size={16} /></button>
                                                <button onClick={() => handlePrintBarcode(item)} title="Print barcode" style={{ background: '#fff7ed', border: '1px solid #FFB84D', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#D2691E' }}><Download size={16} /></button>
                                                <button onClick={() => openAudit(item)} title="Stock Audit & History" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#7c3aed' }}><History size={16} /></button>
                                                {isAdmin && <button onClick={() => openRestock(item)} title="Restock" style={{ background: '#FFF7E6', border: '1px solid #FF8A1E', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#F7941D' }}><RefreshCw size={16} /></button>}
                                                <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}><Edit3 size={16} /></button>
                                                {isAdmin && <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {pagedItems.map(item => {
                                const isLowStock = item.stock <= (item.min_stock || 5);
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            padding: '15px',
                                            border: isLowStock ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {item.name}
                                                    {item.sell_type === 'weight' && <span style={{ fontSize: '0.5rem', fontWeight: 950, padding: '2px 6px', background: '#F7941D', color: 'white', borderRadius: '4px' }}>KG</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '3px 8px', background: '#f1f5f9', borderRadius: '4px', color: '#475569' }}>{item.category?.toUpperCase()}</span>
                                                    {item.batch_no && <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444' }}>BATCH: {item.batch_no}</span>}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 950, color: isLowStock ? '#ef4444' : '#8B2500' }}>{item.stock}</div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8' }}>{item.sell_type === 'weight' ? 'KG' : item.unit.toUpperCase()}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>RETAIL PRICE</p>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 950, color: '#F7941D' }}>Rs {(item.price || 0).toLocaleString()}{item.sell_type === 'weight' ? '/kg' : ''}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>EXPIRY</p>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{item.expiry || '-'}</p>
                                            </div>
                                            {isAdmin && (
                                                <>
                                                    <div>
                                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>PURCHASE</p>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>Rs {item.buy_price || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>WHOLESALE</p>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6366f1' }}>Rs {(item.wholesale_price || item.price || 0).toLocaleString()}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => openPriceCheck(item)} title="Quick price update" style={{ background: '#FFFBEA', border: '1px solid #F9C50D', padding: '10px', borderRadius: '8px', color: '#D2691E' }}><TrendingUp size={18} /></button>
                                                <button onClick={() => handlePrintBarcode(item)} title="Print barcode" style={{ background: '#fff7ed', border: '1px solid #FFB84D', padding: '10px', borderRadius: '8px', color: '#D2691E' }}><Download size={18} /></button>
                                                <button onClick={() => openAudit(item)} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '10px', borderRadius: '8px', color: '#7c3aed' }}><History size={18} /></button>
                                                {isAdmin && <button onClick={() => openRestock(item)} style={{ background: '#FFF7E6', border: '1px solid #FF8A1E', padding: '10px', borderRadius: '8px', color: '#F7941D' }}><RefreshCw size={18} /></button>}
                                                <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', color: '#64748b' }}><Edit3 size={18} /></button>
                                            </div>
                                            {isAdmin && <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '10px', borderRadius: '8px', color: '#ef4444' }}><Trash2 size={18} /></button>}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* PAGINATION BAR */}
                <Pagination
                    page={safePage}
                    totalPages={totalPages}
                    totalItems={filteredItems.length}
                    pageSize={PAGE_SIZE}
                    onChange={setCurrentPage}
                />
            </div>

            {/* AUDIT MODAL */}
            <AnimatePresence>
                {isAuditModalOpen && auditItem && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '15px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#7c3aed', padding: window.innerWidth <= 480 ? '15px 20px' : '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '10px' }}><History size={20} /> AUDIT TRAIL</h3>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 700 }}>{auditItem.name}</p>
                                </div>
                                <button onClick={() => setIsAuditModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>

                            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#7c3aed', marginBottom: '4px' }}>OPENING</p>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#4c1d95' }}>{auditItem.initial_stock || 0}</h4>
                                    </div>
                                    <div style={{ background: '#FFF7E6', padding: '12px', borderRadius: '12px', border: '1px solid #FFEFD0' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#F7941D', marginBottom: '4px' }}>RESTOCKED</p>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#7A1E0C' }}>{(auditItem.restock_history || []).reduce((acc, h) => acc + h.quantity, 0)}</h4>
                                    </div>
                                    <div style={{ background: '#fff1f2', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#e11d48', marginBottom: '4px' }}>SOLD</p>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#881337' }}>{auditItem.total_sold || 0}</h4>
                                    </div>
                                </div>

                                <h5 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', marginBottom: '12px' }}>PRODUCT LEDGER {ledgerLoading && <span style={{ color: '#F7941D' }}>· loading sales…</span>}</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(() => {
                                        // Build a combined ledger: ADDED (restock) + SOLD (sale_items), newest first.
                                        const addedEntries = (auditItem.restock_history || []).map((log) => ({
                                            type: 'ADDED',
                                            qty: log.quantity,
                                            price: log.buy_price,
                                            date: log.date
                                        }));
                                        const soldEntries = (ledgerSales || []).map((s) => ({
                                            type: 'SOLD',
                                            qty: (s.quantity != null ? s.quantity : (s.qty != null ? s.qty : 0)),
                                            price: (s.price != null ? s.price : (s.unit_price != null ? s.unit_price : 0)),
                                            date: s.date || s.created_at || null
                                        }));
                                        const combined = [...addedEntries, ...soldEntries].sort(
                                            (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
                                        );
                                        if (combined.length === 0) {
                                            return (
                                                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '16px' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>No movements found.</p>
                                                </div>
                                            );
                                        }
                                        return combined.map((log, idx) => {
                                            const isSold = log.type === 'SOLD';
                                            return (
                                                <div key={idx} style={{ padding: '12px', background: isSold ? '#fff1f2' : '#f8fafc', borderRadius: '12px', border: `1px solid ${isSold ? '#fecaca' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <p style={{ fontSize: '0.8rem', fontWeight: 900, color: isSold ? '#e11d48' : '#1e293b' }}>
                                                            {isSold ? '−' : '+'}{(log.qty || 0)} {isSold ? 'SOLD' : 'ADDED'}
                                                        </p>
                                                        <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>{log.date ? new Date(log.date).toLocaleDateString() : '—'}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: isSold ? '#e11d48' : '#F7941D' }}>{isSold ? 'Rs' : 'Cost: Rs'} {(log.price || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                            <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button onClick={() => handlePrintBarcode(auditItem)} style={{ padding: '12px 20px', background: '#FFF7E6', border: '1px solid #F7941D', borderRadius: '10px', color: '#D2691E', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> PRINT BARCODE</button>
                                <button onClick={() => setIsAuditModalOpen(false)} style={{ padding: '12px 25px', background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>CLOSE</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ENROLL FULL SCREEN VIEW */}
            {isModalOpen && (
                <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>

                        {/* HEADER */}
                        <div style={{ background: 'linear-gradient(135deg, #8B2500 0%, #F7941D 100%)', padding: '18px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.02em' }}><Plus size={20} /> {editingItem ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* ---- BASIC INFO CARD ---- */}
                            {(() => {
                                const L = { fontSize: '0.62rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px', letterSpacing: '0.05em', textTransform: 'uppercase' };
                                const I = { width: '100%', padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: 'white' };
                                const card = { background: 'white', border: '1px solid #eef1f5', borderRadius: '14px', padding: '16px' };
                                const sectionTitle = { fontSize: '0.6rem', fontWeight: 900, color: '#D2691E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' };
                                const isWeight = formData.sell_type === 'weight';
                                return (
                                    <>
                                        {/* SECTION 1: Product basics */}
                                        <div style={card}>
                                            <div style={sectionTitle}><Box size={13} /> Product Details</div>
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                                                <div style={{ width: '72px', height: '72px', borderRadius: '12px', border: '2px dashed #F7941D', background: formData.image ? '#fff' : '#FFF7E6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                    {formData.image
                                                        ? <img src={formData.image} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : <Box size={26} color="#F7941D" />}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ ...L, marginBottom: 0 }}>Product Image</label>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <label style={{ padding: '8px 14px', background: '#FFF7E6', border: '1.5px solid #F7941D', color: '#D2691E', borderRadius: '8px', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}>
                                                            {formData.image ? 'CHANGE' : 'UPLOAD'}
                                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                                                                const file = e.target.files && e.target.files[0];
                                                                if (!file) return;
                                                                const MAX = 1024 * 1024; // 1 MB hard limit
                                                                if (file.size > MAX) {
                                                                    alert('Image 1 MB se bari hai (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB). 1 MB se choti image chunein.');
                                                                    e.target.value = '';
                                                                    return;
                                                                }
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    if (typeof reader.result === 'string' && reader.result.length > 1.4 * 1024 * 1024) {
                                                                        alert('Yeh image save karne ke liye bari hai. Choti image chunein.');
                                                                        return;
                                                                    }
                                                                    setFormData({ ...formData, image: reader.result });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }} />
                                                        </label>
                                                        {formData.image && (
                                                            <button type="button" onClick={() => setFormData({ ...formData, image: '' })} style={{ padding: '8px 14px', background: 'white', border: '1.5px solid #fecaca', color: '#ef4444', borderRadius: '8px', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer' }}>REMOVE</button>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 700 }}>JPG / PNG · under 1 MB</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 560 ? '1fr' : '1.6fr 1fr', gap: '14px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <label style={L}>Product Name</label>
                                                    <input required placeholder="e.g. Barfi" style={I} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                                    {nameSuggestion && formData.name && nameSuggestion.toLowerCase() !== formData.name.toLowerCase() && (
                                                        <div style={{ position: 'absolute', left: '13px', top: '32px', color: '#cbd5e1', pointerEvents: 'none', fontSize: '0.9rem', fontWeight: 700 }}>
                                                            {formData.name}<span style={{ color: '#94a3b8' }}>{nameSuggestion.slice(formData.name.length)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label style={L}>Batch No</label>
                                                    <input placeholder="B-204" style={I} value={formData.batch_no} onChange={e => setFormData({ ...formData, batch_no: e.target.value })} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 560 ? '1fr' : '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                                                <div>
                                                    <label style={L}>Category</label>
                                                    <select style={{ ...I, cursor: 'pointer' }}
                                                        value={categories.includes(formData.category) ? formData.category : 'Other'}
                                                        onChange={e => { const v = e.target.value; setFormData({ ...formData, category: v === 'Other' ? '' : v }); }}>
                                                        {categories.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                    {!categories.includes(formData.category) && (
                                                        <input autoFocus placeholder="Type new category..." style={{ ...I, marginTop: '8px', border: '1.5px solid #F7941D', background: '#FFF7E6' }} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                                    )}
                                                </div>
                                                <div>
                                                    <label style={L}>Unit</label>
                                                    <input placeholder="pcs / pack / box" disabled={isWeight} style={{ ...I, background: isWeight ? '#f1f5f9' : 'white', color: isWeight ? '#94a3b8' : '#1e293b' }} value={isWeight ? 'kg' : formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label style={L}>Manufacturer</label>
                                                    <input placeholder="Company" style={I} value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 2: Sell type */}
                                        <div style={{ ...card, background: isWeight ? '#FFF7E6' : 'white', border: isWeight ? '1.5px solid #F7941D' : '1px solid #eef1f5' }}>
                                            <div style={sectionTitle}><Hash size={13} /> Sell Type</div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button type="button" onClick={() => setFormData({ ...formData, sell_type: 'piece' })}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid', borderColor: !isWeight ? '#F7941D' : '#e2e8f0', background: !isWeight ? 'linear-gradient(135deg, #F7941D 0%, #D2691E 100%)' : 'white', color: !isWeight ? 'white' : '#64748b', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}>
                                                    By Piece
                                                </button>
                                                <button type="button" onClick={() => setFormData({ ...formData, sell_type: 'weight', unit: 'kg' })}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid', borderColor: isWeight ? '#F7941D' : '#e2e8f0', background: isWeight ? 'linear-gradient(135deg, #F7941D 0%, #D2691E 100%)' : 'white', color: isWeight ? 'white' : '#64748b', fontWeight: 900, fontSize: '0.82rem', cursor: 'pointer' }}>
                                                    By Weight (kg)
                                                </button>
                                            </div>
                                            {isWeight && <p style={{ fontSize: '0.66rem', fontWeight: 700, color: '#B4581F', marginTop: '10px', margin: '10px 0 0' }}>Loose sweets — sold by weight. Enter the rate per kg below.</p>}
                                        </div>

                                        {/* SECTION 3: Pricing */}
                                        <div style={card}>
                                            <div style={sectionTitle}><TrendingUp size={13} /> Pricing</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 560 ? '1fr' : (isAdmin ? '1fr 1fr 1fr' : '1fr 1fr'), gap: '14px' }}>
                                                {isAdmin && (
                                                    <div>
                                                        <label style={L}>Purchase Price</label>
                                                        <input type="number" required style={I} value={formData.buy_price} onChange={e => setFormData({ ...formData, buy_price: e.target.value })} />
                                                    </div>
                                                )}
                                                <div>
                                                    <label style={{ ...L, color: '#D2691E' }}>{isWeight ? 'Sale Price / kg' : 'Sale Price'}</label>
                                                    <input type="number" required style={{ ...I, border: '1.5px solid #F7941D', background: '#FFFBF2' }} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label style={{ ...L, color: '#8B2500' }}>{isWeight ? 'Wholesale / kg' : 'Wholesale Price'}</label>
                                                    <input type="number" style={{ ...I, border: '1.5px solid #FFB84D' }} value={formData.wholesale_price} onChange={e => setFormData({ ...formData, wholesale_price: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 4: Stock & expiry */}
                                        <div style={card}>
                                            <div style={sectionTitle}><AlertCircle size={13} /> Stock & Expiry</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 560 ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '14px' }}>
                                                <div>
                                                    <label style={L}>{isWeight ? 'Stock (kg)' : 'Stock'}</label>
                                                    <input type="number" step={isWeight ? '0.05' : '1'} required style={I} value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label style={{ ...L, color: '#ef4444' }}>Min Alert</label>
                                                    <input type="number" style={I} value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label style={L}>Expiry</label>
                                                    <input type="date" style={I} value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label style={L}>Critical Days</label>
                                                    <input type="number" style={I} value={formData.critical_days} onChange={e => setFormData({ ...formData, critical_days: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECTION 5: Barcode */}
                                        <div style={card}>
                                            <div style={sectionTitle}><Search size={13} /> Barcode / SKU</div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input placeholder="Scan or type barcode" style={{ ...I, flex: 1 }} value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
                                                <button type="button" onClick={() => setFormData({ ...formData, barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString() })} style={{ padding: '0 18px', background: '#FFF7E6', border: '1.5px solid #F7941D', color: '#D2691E', borderRadius: '9px', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>GENERATE</button>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}

                            {/* FOOTER ACTIONS */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', paddingBottom: window.innerWidth <= 480 ? '10px' : '0' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '11px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>CANCEL</button>
                                <button type="submit" disabled={isSaving} style={{ flex: 2, padding: '14px', borderRadius: '11px', border: 'none', background: 'linear-gradient(135deg, #F7941D 0%, #D2691E 100%)', color: 'white', fontWeight: 900, cursor: 'pointer', opacity: isSaving ? 0.7 : 1, boxShadow: '0 6px 14px rgba(247,148,29,0.3)' }}>
                                    {isSaving ? 'SAVING...' : (editingItem ? 'UPDATE PRODUCT' : 'SAVE PRODUCT')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* RESTOCK MODAL */}
            {isRestockModalOpen && restockItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#FF8A1E', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 950 }}><Layers size={20} /> RESTOCK</h3>
                            <button onClick={() => setIsRestockModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRestock} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>QTY TO ADD</label>
                                <input type="number" required placeholder="100" style={{ width: '100%', padding: '12px', border: '2px solid #FF8A1E', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 950 }} value={restockQty} onChange={e => setRestockQty(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>COST PER UNIT</label>
                                <input type="number" required placeholder="Cost" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 950 }} value={restockBuyPrice} onChange={e => setRestockBuyPrice(e.target.value)} />
                            </div>
                            <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '15px', background: '#FF8A1E', color: 'white', borderRadius: '10px', fontWeight: 950, opacity: isSaving ? 0.7 : 1 }}>CONFIRM</button>
                        </form>
                    </motion.div>
                </div>
            )}
            {/* IMPORT MODAL */}
            <AnimatePresence>
                {isImportModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ background: '#0369a1', padding: '25px', color: 'white', textAlign: 'center' }}>
                                <ArrowUpCircle size={40} style={{ marginBottom: '15px' }} />
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 950 }}>Bulk Import Inventory</h3>
                                <p style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>Quickly add hundreds of products via Excel</p>
                            </div>

                            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: '#f0f9ff', border: '2px dashed #0ea5e9', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1', marginBottom: '12px' }}>Step 1: Download Format</p>
                                    <button
                                        onClick={downloadTemplate}
                                        style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                    >
                                        DOWNLOAD TEMPLATE
                                    </button>
                                </div>

                                <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '12px' }}>Step 2: Upload Filled File</p>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleImportFile}
                                        style={{ display: 'none' }}
                                        id="import-file-input"
                                    />
                                    <label
                                        htmlFor="import-file-input"
                                        style={{ display: 'inline-block', background: '#FF8A1E', color: 'white', padding: '12px 25px', borderRadius: '8px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                    >
                                        SELECT EXCEL FILE
                                    </label>
                                </div>

                                <button
                                    onClick={() => setIsImportModalOpen(false)}
                                    style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
                                >
                                    CANCEL
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PRICE CHECK / QUICK PRICE UPDATE MODAL */}
            <AnimatePresence>
                {showPriceCheck && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(122,30,12,0.65)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', backdropFilter: 'blur(5px)' }}>
                        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} style={{ background: '#FFF7E6', width: '100%', maxWidth: '520px', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: 'linear-gradient(135deg, #8B2500 0%, #F7941D 100%)', padding: '18px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '10px' }}><Search size={22} /> PRICE CHECK</h3>
                                <button onClick={() => setShowPriceCheck(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ position: 'relative', marginBottom: '18px' }}>
                                    <Search size={22} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#F7941D' }} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Scan or type name / barcode…"
                                        value={priceCheckTerm}
                                        onChange={e => setPriceCheckTerm(e.target.value)}
                                        onKeyDown={handlePriceCheckKey}
                                        style={{ width: '100%', padding: '18px 18px 18px 52px', border: '2.5px solid #F7941D', borderRadius: '14px', fontSize: '1.3rem', fontWeight: 900, outline: 'none', color: '#7A1E0C', background: 'white', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {priceCheckItem ? (
                                    <div style={{ background: 'white', border: '2px solid #FFB84D', borderRadius: '18px', padding: '20px', boxShadow: '0 6px 16px rgba(247,148,29,0.15)' }}>
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ width: '84px', height: '84px', borderRadius: '14px', border: '2px solid #FFEFD0', background: '#FFF7E6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                {priceCheckItem.image
                                                    ? <img src={priceCheckItem.image} alt={priceCheckItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <Box size={34} color="#F7941D" />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e293b', lineHeight: 1.1 }}>{priceCheckItem.name}</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 8px', background: '#FFF7E6', borderRadius: '5px', color: '#D2691E' }}>{priceCheckItem.category?.toUpperCase() || 'PRODUCT'}</span>
                                                    {priceCheckItem.sell_type === 'weight' && <span style={{ fontSize: '0.6rem', fontWeight: 950, padding: '3px 8px', background: '#F7941D', color: 'white', borderRadius: '5px' }}>BY WEIGHT</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'linear-gradient(135deg, #FFF7E6 0%, #FDF3D0 100%)', borderRadius: '14px', padding: '18px', textAlign: 'center', marginBottom: '14px', border: '1px solid #FFEFD0' }}>
                                            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#D2691E', letterSpacing: '0.08em' }}>SALE PRICE</p>
                                            <p style={{ fontSize: '2.6rem', fontWeight: 950, color: '#E63329', lineHeight: 1.1 }}>Rs {(priceCheckItem.price || 0).toLocaleString()}{priceCheckItem.sell_type === 'weight' ? '/kg' : ''}</p>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8' }}>WHOLESALE</p>
                                                <p style={{ fontSize: '1.2rem', fontWeight: 950, color: '#8B2500' }}>Rs {(priceCheckItem.wholesale_price || priceCheckItem.price || 0).toLocaleString()}{priceCheckItem.sell_type === 'weight' ? '/kg' : ''}</p>
                                            </div>
                                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8' }}>IN STOCK</p>
                                                <p style={{ fontSize: '1.2rem', fontWeight: 950, color: (priceCheckItem.stock || 0) <= (priceCheckItem.min_stock || 5) ? '#E63329' : '#1e293b' }}>{(priceCheckItem.stock || 0)}{priceCheckItem.sell_type === 'weight' ? ' kg' : ''}</p>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed #FFEFD0' }}>
                                                <p style={{ fontSize: '0.7rem', fontWeight: 950, color: '#D2691E', letterSpacing: '0.05em', marginBottom: '10px' }}>UPDATE PRICE</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>{priceCheckItem.sell_type === 'weight' ? 'SALE / KG' : 'SALE PRICE'}</label>
                                                        <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #F7941D', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box', background: '#FFFBF2' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>{priceCheckItem.sell_type === 'weight' ? 'WHOLESALE / KG' : 'WHOLESALE'}</label>
                                                        <input type="number" value={editWholesale} onChange={e => setEditWholesale(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #FFB84D', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 900, outline: 'none', boxSizing: 'border-box' }} />
                                                    </div>
                                                </div>
                                                <button onClick={handleQuickPriceSave} disabled={isPriceSaving} style={{ width: '100%', marginTop: '12px', padding: '14px', background: 'linear-gradient(135deg, #F7941D 0%, #D2691E 100%)', color: 'white', border: 'none', borderRadius: '11px', fontWeight: 950, fontSize: '0.9rem', cursor: 'pointer', opacity: isPriceSaving ? 0.7 : 1, boxShadow: '0 6px 14px rgba(247,148,29,0.3)' }}>
                                                    {isPriceSaving ? 'SAVING…' : 'SAVE PRICE'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#B4581F', border: '2px dashed #FFB84D', borderRadius: '18px', background: 'white' }}>
                                        <Search size={40} color="#FFB84D" style={{ marginBottom: '12px' }} />
                                        <p style={{ fontSize: '0.95rem', fontWeight: 800 }}>{priceCheckTerm ? 'No matching product found.' : 'Scan or type to check a price.'}</p>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '14px', borderTop: '1px solid #FFEFD0', textAlign: 'right', flexShrink: 0 }}>
                                <button onClick={() => setShowPriceCheck(false)} style={{ width: window.innerWidth <= 480 ? '100%' : 'auto', padding: '12px 28px', background: '#8B2500', border: 'none', borderRadius: '11px', color: 'white', fontWeight: 900, cursor: 'pointer' }}>CLOSE</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* hidden barcode used only to generate scannable SVG for printing */}
            {printBarcodeItem && (
                <div ref={printBarcodeRef} style={{ position: 'fixed', left: '-9999px', top: 0 }} aria-hidden="true">
                    <Barcode value={String(printBarcodeItem.barcode)} height={55} width={1.6} fontSize={12} background="#ffffff" />
                </div>
            )}
        </div>
    );
};

export default Inventory;
