import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Camera, Upload, Trash2, FileText, Search, Plus, X, Eye, Edit2, CheckCircle2, Clock, AlertCircle, RotateCw, ZoomIn, ZoomOut, Maximize2, Crop, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../database';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import LoadingProgress from '../components/LoadingProgress';

const BillManagement = () => {
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const [bills, setBills] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewBill, setViewBill] = useState(null);
    const [loading, setLoading] = useState(false);
    // Percentage for the first paper-bills load (this screen can hold many
    // scanned bill images, so it's one of the heavier data screens).
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadPct, setLoadPct] = useState(0);
    // Filters + pagination for the bills list.
    const [statusFilter, setStatusFilter] = useState('all');   // all | Paid | Unpaid | Partially Paid
    const [typeFilter, setTypeFilter] = useState('all');       // all | Purchase | Sale
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 12;
    // Device (gallery/file) picker.
    const galleryInputRef = useRef(null);
    // Mobile camera picker (uses capture attr; works on phones/tablets).
    const cameraInputRef = useRef(null);
    // Live webcam capture (for desktop, where the capture attr does nothing).
    const [showWebcam, setShowWebcam] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [viewerScale, setViewerScale] = useState(1);
    const [viewerRotation, setViewerRotation] = useState(0);
    // Pan (drag) offset for the zoomed image + drag tracking refs.
    const [viewerPos, setViewerPos] = useState({ x: 0, y: 0 });
    const dragState = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

    const resetViewer = () => {
        setViewerScale(1);
        setViewerRotation(0);
        setViewerPos({ x: 0, y: 0 });
    };

    // Drag to pan (works with mouse + touch).
    const onDragStart = (clientX, clientY) => {
        if (viewerScale <= 1) return; // only pan when zoomed in
        dragState.current = {
            dragging: true,
            startX: clientX, startY: clientY,
            baseX: viewerPos.x, baseY: viewerPos.y,
        };
    };
    const onDragMove = (clientX, clientY) => {
        if (!dragState.current.dragging) return;
        setViewerPos({
            x: dragState.current.baseX + (clientX - dragState.current.startX),
            y: dragState.current.baseY + (clientY - dragState.current.startY),
        });
    };
    const onDragEnd = () => { dragState.current.dragging = false; };

    // Mouse wheel to zoom; double-click toggles zoom in/out.
    const onWheelZoom = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        setViewerScale(s => {
            const next = Math.min(4, Math.max(1, +(s + delta).toFixed(2)));
            if (next === 1) setViewerPos({ x: 0, y: 0 }); // recenter at 100%
            return next;
        });
    };
    const onDoubleClickZoom = () => {
        setViewerScale(s => {
            if (s > 1) { setViewerPos({ x: 0, y: 0 }); return 1; }
            return 2;
        });
    };

    const [editingBill, setEditingBill] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentages
    const [newBill, setNewBill] = useState({
        title: '',
        amount: '',
        paid_amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'Purchase',
        status: 'Unpaid',
        note: '',
        image: ''
    });

    useEffect(() => {
        fetchBills();
        const subscription = db
            .channel('paper_bills_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'paper_bills' }, fetchBills)
            .subscribe();

        return () => {
            db.removeChannel(subscription);
        };
    }, []);

    const fetchBills = async () => {
        // Animate the percentage upward while the (potentially large) image-
        // heavy bills load, so the user sees progress instead of a blank screen.
        let pct = 0;
        const timer = setInterval(() => {
            pct = Math.min(pct + 12, 90); // creep toward 90% until data arrives
            setLoadPct(pct);
        }, 120);

        const { data, error } = await db
            .from('paper_bills')
            .select('*')
            .order('date', { ascending: false });

        clearInterval(timer);
        setLoadPct(100);

        if (data) setBills(data);
        if (error) console.error(error);

        // Hide the loader shortly after hitting 100% (only matters first time).
        setTimeout(() => setInitialLoading(false), 350);
    };

    // Decide what "Camera" should do based on the device.
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(
        typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );

    const handleCameraClick = () => {
        if (isMobileDevice) {
            // Phones/tablets: the capture attribute opens the native camera.
            cameraInputRef.current?.click();
        } else {
            // Desktop: open a live webcam modal (capture attr is ignored here).
            openWebcam();
        }
    };

    const openWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, audio: false
            });
            streamRef.current = stream;
            setShowWebcam(true);
            // Attach after the modal renders.
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 100);
        } catch (err) {
            console.error('Webcam error:', err);
            toast.error('Camera not available. Please allow camera access, or use Device instead.');
        }
    };

    const closeWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setShowWebcam(false);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        // Reuse the same compression pipeline as file uploads.
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        processImageDataUrl(dataUrl);
        closeWebcam();
    };

    // Clean up the webcam stream if the component unmounts while open.
    useEffect(() => () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }, []);

    // Shared: take a data URL, resize/compress it, store on newBill.image.
    const processImageDataUrl = (dataUrl) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX = 1200;
            if (width > height) {
                if (width > MAX) { height *= MAX / width; width = MAX; }
            } else {
                if (height > MAX) { width *= MAX / height; height = MAX; }
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            setNewBill(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = dataUrl;
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions 1200px
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setOriginalImage(compressedDataUrl);
                setNewBill({ ...newBill, image: compressedDataUrl });
                toast.success("Image uploaded. You can now crop it!");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const applyCrop = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleX = img.width / 100;
            const scaleY = img.height / 100;
            
            const targetX = cropBox.x * scaleX;
            const targetY = cropBox.y * scaleY;
            const targetW = cropBox.w * scaleX;
            const targetH = cropBox.h * scaleY;

            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, targetX, targetY, targetW, targetH, 0, 0, targetW, targetH);
            
            const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
            setNewBill({ ...newBill, image: croppedUrl });
            setIsCropping(false);
            toast.success("Cropped successfully!");
        };
        img.src = originalImage;
    };

    const handleSaveBill = async (e) => {
        e.preventDefault();
        if (!newBill.title || !newBill.amount) {
            toast.error("Title and Amount are required");
            return;
        }

        setLoading(true);
        try {
            const billData = {
                ...newBill,
                amount: parseFloat(newBill.amount),
                paid_amount: newBill.status === 'Partially Paid' ? parseFloat(newBill.paid_amount || 0) : (newBill.status === 'Paid' ? parseFloat(newBill.amount) : 0),
                created_by: user?.name
            };

            if (editingBill) {
                const { error } = await db
                    .from('paper_bills')
                    .update(billData)
                    .eq('id', editingBill.id);
                if (error) throw error;
                toast.success("Bill updated successfully!");
            } else {
                const { error } = await db
                    .from('paper_bills')
                    .insert([billData]);
                if (error) throw error;
                toast.success("New bill saved!");
            }
            
            setIsModalOpen(false);
            setEditingBill(null);
            setNewBill({ title: '', amount: '', paid_amount: '', date: new Date().toISOString().split('T')[0], type: 'Purchase', status: 'Unpaid', note: '', image: '' });
        } catch (err) {
            console.error(err);
            toast.error("Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (bill) => {
        setEditingBill(bill);
        setNewBill({
            title: bill.title,
            amount: bill.amount,
            paid_amount: bill.paid_amount || '',
            date: bill.date,
            type: bill.type || 'Purchase',
            status: bill.status || 'Unpaid',
            note: bill.note || '',
            image: bill.image || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!isAdmin) return;
        if (window.confirm("Delete this bill record permanently?")) {
            try {
                const { error } = await db
                    .from('paper_bills')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                toast.success("Bill deleted from Database");
            } catch (err) {
                toast.error("Delete failed");
            }
        }
    };

    // Combined filtering: search text + payment status + type + date range.
    const filteredBills = useMemo(() => {
        return bills.filter(b => {
            const matchesSearch =
                b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.note?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (typeFilter !== 'all' && b.type !== typeFilter) return false;

            if (dateFrom && new Date(b.date) < new Date(dateFrom)) return false;
            // include the whole "to" day by comparing against end of that day
            if (dateTo && new Date(b.date) > new Date(dateTo + 'T23:59:59')) return false;

            return true;
        });
    }, [bills, searchTerm, statusFilter, typeFilter, dateFrom, dateTo]);

    // Pagination: only render one page of cards at a time so a large number of
    // image-heavy bills doesn't slow the screen down.
    const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedBills = filteredBills.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Whenever a filter changes, jump back to page 1.
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, typeFilter, dateFrom, dateTo]);

    const clearFilters = () => {
        setStatusFilter('all'); setTypeFilter('all');
        setDateFrom(''); setDateTo(''); setSearchTerm('');
    };
    const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo || searchTerm;

    // Financial Summary Logic
    const summary = useMemo(() => {
        return bills.reduce((acc, b) => {
            const remaining = (b.amount || 0) - (b.paid_amount || 0);
            if (b.type === 'Sale') acc.toReceive += remaining;
            else if (b.type === 'Purchase') acc.toPay += remaining;
            return acc;
        }, { toReceive: 0, toPay: 0 });
    }, [bills]);

    // First load of this data-heavy screen shows a percentage loader.
    if (initialLoading) {
        return <LoadingProgress progress={loadPct} label="Loading paper bills" fullscreen={false} />;
    }

    const isMobile = window.innerWidth <= 768;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: isMobile ? '12px' : '20px', overflowY: isMobile ? 'auto' : 'hidden', overflowX: 'hidden' }}>
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 600 ? 'stretch' : 'center', 
                marginBottom: '20px', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px' : '20px 25px', 
                borderRadius: '15px', 
                border: '1px solid #e2e8f0',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f59e0b', padding: '8px', borderRadius: '10px', color: 'white' }}><FileText size={window.innerWidth <= 480 ? 18 : 20} /></div>
                        Paper Bill Management
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Digitize and store your physical supplier bills & receipts</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <Plus size={20} /> ADD NEW BILL
                </button>
            </header>

            <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', flex: isMobile ? 'none' : 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'visible' : 'hidden' }}>
                {/* FINANCIAL SUMMARY BAR */}
                <div style={{
                    padding: isMobile ? '12px 15px' : '15px 25px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: window.innerWidth <= 640 ? 'column' : 'row',
                    gap: isMobile ? '10px' : '15px'
                }}>
                    <div style={{ flex: 1, background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #FDF3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#F7941D', textTransform: 'uppercase' }}>To Receive (Lena Hai)</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#8B2500' }}>Rs {summary.toReceive.toLocaleString()}</h4>
                        </div>
                        <div style={{ background: '#FDF3D0', padding: '8px', borderRadius: '50%', color: '#F7941D' }}><Plus size={18} /></div>
                    </div>
                    <div style={{ flex: 1, background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>To Pay (Dena Hai)</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#991b1b' }}>Rs {summary.toPay.toLocaleString()}</h4>
                        </div>
                        <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '50%', color: '#ef4444' }}><Minus size={18} /></div>
                    </div>
                </div>

                <div style={{
                    padding: isMobile ? '12px 15px' : '15px 25px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {/* Row 1: search + record count */}
                    <div style={{
                        display: 'flex',
                        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
                        gap: '12px'
                    }}>
                        <div style={{ position: 'relative', width: window.innerWidth <= 768 ? '100%' : '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                                placeholder="Search by supplier or bill title..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textAlign: window.innerWidth <= 768 ? 'center' : 'right' }}>
                            Showing {filteredBills.length} of {bills.length} Records
                        </div>
                    </div>

                    {/* Row 2: status pills + type + date range + clear */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                        {/* Status pills — full width & evenly split on mobile */}
                        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', width: isMobile ? '100%' : 'auto' }}>
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'Paid', label: 'Paid' },
                                { key: 'Unpaid', label: 'Unpaid' },
                                { key: 'Partially Paid', label: 'Partial' },
                            ].map(opt => {
                                const active = statusFilter === opt.key;
                                const activeBg = opt.key === 'Paid' ? '#E8571F'
                                    : opt.key === 'Unpaid' ? '#ef4444'
                                    : opt.key === 'Partially Paid' ? '#f59e0b' : '#0f172a';
                                return (
                                    <button
                                        key={opt.key}
                                        onClick={() => setStatusFilter(opt.key)}
                                        style={{
                                            flex: isMobile ? 1 : 'none',
                                            padding: isMobile ? '9px 4px' : '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                            fontSize: '0.72rem', fontWeight: 800,
                                            background: active ? activeBg : 'transparent',
                                            color: active ? 'white' : '#64748b',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Type dropdown — full width on mobile */}
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 800, color: '#334155', background: 'white', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
                        >
                            <option value="all">All Types</option>
                            <option value="Purchase">Purchase (Dena)</option>
                            <option value="Sale">Sale (Lena)</option>
                        </select>

                        {/* Date range — full width, inputs share the row on mobile */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                            <Clock size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                title="From date"
                                style={{ flex: isMobile ? 1 : 'none', minWidth: 0, padding: '9px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}
                            />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', flexShrink: 0 }}>–</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                title="To date"
                                style={{ flex: isMobile ? 1 : 'none', minWidth: 0, padding: '9px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}
                            />
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'center', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <X size={13} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: window.innerWidth <= 480 ? '15px' : '20px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: isMobile ? '12px' : '20px'
                    }}>
                        {pagedBills.map(bill => (
                            <div key={bill.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                {bill.image ? (
                                    <div style={{ height: '160px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => setViewBill(bill)}>
                                        <img src={bill.image} alt="Bill" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="hover-eye">
                                            <Eye color="white" />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: '160px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Camera size={32} color="#94a3b8" />
                                    </div>
                                )}
                                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '5px' }}>
                                        <h3 style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.title}</h3>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <span style={{ background: bill.type === 'Sale' ? '#e0f2fe' : '#fef3c7', color: bill.type === 'Sale' ? '#0369a1' : '#92400e', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>{bill.type?.toUpperCase()}</span>
                                            <span style={{ 
                                                background: bill.status === 'Paid' ? '#FDF3D0' : bill.status === 'Partially Paid' ? '#ffedd5' : '#fee2e2', 
                                                color: bill.status === 'Paid' ? '#B23A0E' : bill.status === 'Partially Paid' ? '#c2410c' : '#b91c1c', 
                                                fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 
                                            }}>{bill.status?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ 
                                                fontSize: '1rem', 
                                                fontWeight: 950, 
                                                color: bill.status === 'Paid' ? '#B23A0E' : bill.status === 'Partially Paid' ? '#c2410c' : '#b91c1c' 
                                            }}>Rs {bill.amount.toLocaleString()}</span>
                                            {bill.status === 'Partially Paid' && <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>Paid: Rs {bill.paid_amount?.toLocaleString()}</span>}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{new Date(bill.date).toLocaleDateString()}</span>
                                    </div>
                                    {bill.note && <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '15px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{bill.note}</p>}
                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setViewBill(bill)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Eye size={14} /> View
                                        </button>
                                        <button onClick={() => handleEdit(bill)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #6366f1', background: '#eef2ff', color: '#6366f1', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Edit2 size={14} /> Edit
                                        </button>
                                        {isAdmin && (
                                            <button onClick={() => handleDelete(bill.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#fff1f1', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty state when filters match nothing */}
                    {filteredBills.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                            <FileText size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: '#64748b' }}>No bills match your filters</p>
                            {hasActiveFilters && (
                                <button onClick={clearFilters} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#F7941D', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '14px 25px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            style={{
                                padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                background: safePage === 1 ? '#f1f5f9' : 'white',
                                color: safePage === 1 ? '#cbd5e1' : '#334155',
                                fontSize: '0.75rem', fontWeight: 800,
                                cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <ChevronLeft size={15} /> Prev
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(pg => pg === 1 || pg === totalPages || Math.abs(pg - safePage) <= 1)
                            .map((pg, idx, arr) => (
                                <React.Fragment key={pg}>
                                    {idx > 0 && pg - arr[idx - 1] > 1 && (
                                        <span style={{ color: '#cbd5e1', fontWeight: 800, padding: '0 2px' }}>…</span>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(pg)}
                                        style={{
                                            minWidth: '36px', padding: '8px 0', borderRadius: '8px',
                                            border: pg === safePage ? 'none' : '1px solid #e2e8f0',
                                            background: pg === safePage ? '#0f172a' : 'white',
                                            color: pg === safePage ? 'white' : '#334155',
                                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                                        }}
                                    >
                                        {pg}
                                    </button>
                                </React.Fragment>
                            ))}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            style={{
                                padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                background: safePage === totalPages ? '#f1f5f9' : 'white',
                                color: safePage === totalPages ? '#cbd5e1' : '#334155',
                                fontSize: '0.75rem', fontWeight: 800,
                                cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            Next <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal for adding bill */}
            {/* LIVE WEBCAM MODAL (desktop camera capture) */}
            {showWebcam && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#0f172a', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: 'white', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Camera size={20} /> Take a Photo
                            </h3>
                            <button type="button" onClick={closeWebcam} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={22} /></button>
                        </div>
                        <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3' }}>
                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={closeWebcam} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="button" onClick={capturePhoto} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: '#F7941D', color: 'white', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Camera size={18} /> CAPTURE PHOTO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ 
                        background: 'white', 
                        width: window.innerWidth <= 480 ? '100%' : '480px', 
                        maxHeight: '90vh',
                        borderRadius: window.innerWidth <= 480 ? '20px 20px 0 0' : '20px', 
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ background: '#0f172a', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', flexShrink: 0 }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>{editingBill ? 'EDIT DIGITAL RECORD' : 'UPLOAD PHYSICAL BILL'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingBill(null); setIsCropping(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                        </div>
                        <form onSubmit={handleSaveBill} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setNewBill({ ...newBill, type: 'Purchase' })}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: newBill.type === 'Purchase' ? '#fef3c7' : 'white', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', color: newBill.type === 'Purchase' ? '#92400e' : '#64748b' }}
                                >
                                    I PURCHASED (Khareed)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setNewBill({ ...newBill, type: 'Sale' })}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: newBill.type === 'Sale' ? '#e0f2fe' : 'white', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', color: newBill.type === 'Sale' ? '#0369a1' : '#64748b' }}
                                >
                                    I SOLD (Farookht)
                                </button>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>SUPPLIER / CUSTOMER NAME</label>
                                <input 
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                    value={newBill.title} 
                                    onChange={e => setNewBill({ ...newBill, title: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>TOTAL BILL (RS)</label>
                                    <input 
                                        type="number"
                                        required
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                        value={newBill.amount} 
                                        onChange={e => setNewBill({ ...newBill, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>BILL DATE</label>
                                    <input 
                                        type="date"
                                        required
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                        value={newBill.date} 
                                        onChange={e => setNewBill({ ...newBill, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>PAYMENT STATUS</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['Paid', 'Unpaid', 'Partially Paid'].map(s => (
                                        <button 
                                            key={s}
                                            type="button"
                                            onClick={() => setNewBill({ ...newBill, status: s })}
                                            style={{ flex: 1, padding: '10px 5px', borderRadius: '8px', border: '1px solid #e2e8f0', background: newBill.status === s ? '#0f172a' : 'white', color: newBill.status === s ? 'white' : '#64748b', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}
                                        >
                                            {s.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newBill.status === 'Partially Paid' && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT PAID SO FAR (RS)</label>
                                    <input 
                                        type="number"
                                        style={{ width: '100%', padding: '12px', border: '1px solid #6366f1', borderRadius: '10px', fontWeight: 700, background: '#f5f3ff' }} 
                                        value={newBill.paid_amount} 
                                        onChange={e => setNewBill({ ...newBill, paid_amount: e.target.value })}
                                        placeholder="Enter amount paid..."
                                    />
                                </motion.div>
                            )}

                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>{editingBill ? 'REPLACE PHOTO (OPTIONAL)' : 'ATTACH BILL PHOTO'}</label>
                                
                                {!isCropping ? (
                                    <div style={{ position: 'relative' }}>
                                        {newBill.image ? (
                                            /* Image already chosen: show preview + crop + change */
                                            <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                                <img src={newBill.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsCropping(true); if(!originalImage) setOriginalImage(newBill.image); }}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', background: '#0f172a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', zIndex: 10 }}
                                                >
                                                    <Crop size={14} /> CROP
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewBill({ ...newBill, image: '' })}
                                                    style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', zIndex: 10 }}
                                                >
                                                    <X size={14} /> CHANGE
                                                </button>
                                            </div>
                                        ) : (
                                            /* No image yet: let the user choose Camera or Device */
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleCameraClick}
                                                    style={{ flex: 1, border: '2px dashed #cbd5e1', borderRadius: '12px', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}
                                                    onMouseOver={e => { e.currentTarget.style.borderColor = '#F7941D'; e.currentTarget.style.background = '#FFF7E6'; }}
                                                    onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                                >
                                                    <div style={{ background: '#FFEFD0', padding: '10px', borderRadius: '50%', color: '#F7941D' }}><Camera size={22} /></div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>Camera</span>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>Take a photo</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => galleryInputRef.current?.click()}
                                                    style={{ flex: 1, border: '2px dashed #cbd5e1', borderRadius: '12px', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}
                                                    onMouseOver={e => { e.currentTarget.style.borderColor = '#E8571F'; e.currentTarget.style.background = '#f0fdf4'; }}
                                                    onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                                >
                                                    <div style={{ background: '#FDF3D0', padding: '10px', borderRadius: '50%', color: '#E8571F' }}><Upload size={22} /></div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b' }}>Device</span>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>Choose from files</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Hidden inputs: camera (capture) + gallery (no capture) */}
                                        <input
                                            ref={cameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <input
                                            ref={galleryInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative', background: '#0f172a', borderRadius: '12px', padding: '10px', overflow: 'hidden' }}>
                                        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                                            <img src={originalImage} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5 }} />
                                            
                                            {/* Crop Overlay */}
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: `${cropBox.y}%`, 
                                                left: `${cropBox.x}%`, 
                                                width: `${cropBox.w}%`, 
                                                height: `${cropBox.h}%`, 
                                                border: '2px solid #FF8A1E',
                                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                                zIndex: 5
                                            }}>
                                                <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, background: 'white', border: '2px solid #FF8A1E' }} />
                                                <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, background: 'white', border: '2px solid #FF8A1E' }} />
                                                <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, background: 'white', border: '2px solid #FF8A1E' }} />
                                                <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, background: 'white', border: '2px solid #FF8A1E' }} />
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            <button type="button" onClick={applyCrop} style={{ flex: 1, padding: '10px', background: '#FF8A1E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>APPLY CROP</button>
                                            <button type="button" onClick={() => setIsCropping(false)} style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>CANCEL</button>
                                        </div>
                                        
                                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 800 }}>ADJUST SIDES & TOP</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: 'white', fontSize: '0.6rem' }}>X</span>
                                                <input type="range" min="0" max="40" value={cropBox.x} onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setCropBox({ ...cropBox, x: val, w: 100 - (val * 2) });
                                                }} style={{ width: '100%' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: 'white', fontSize: '0.6rem' }}>Y</span>
                                                <input type="range" min="0" max="40" value={cropBox.y} onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setCropBox({ ...cropBox, y: val, h: 100 - (val * 2) });
                                                }} style={{ width: '100%' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>NOTES</label>
                                <textarea 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, minHeight: '60px' }} 
                                    value={newBill.note} 
                                    onChange={e => setNewBill({ ...newBill, note: e.target.value })}
                                />
                            </div>
                            <button 
                                disabled={loading || isCropping}
                                style={{ width: '100%', padding: '15px', background: '#F7941D', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: (loading || isCropping) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >
                                {loading ? "PROCESSING..." : (editingBill ? "UPDATE RECORD" : "SAVE DIGITAL BILL")}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Viewer Modal */}
            {viewBill && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ 
                        background: 'white', 
                        width: '95vw', 
                        maxWidth: '900px', 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                        height: window.innerWidth <= 768 ? '95vh' : '80vh' 
                    }}>
                        <div
                            onWheel={onWheelZoom}
                            onDoubleClick={onDoubleClickZoom}
                            onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
                            onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
                            onMouseUp={onDragEnd}
                            onMouseLeave={onDragEnd}
                            onTouchStart={(e) => { const t = e.touches[0]; onDragStart(t.clientX, t.clientY); }}
                            onTouchMove={(e) => { const t = e.touches[0]; onDragMove(t.clientX, t.clientY); }}
                            onTouchEnd={onDragEnd}
                            style={{
                                flex: 1,
                                background: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative',
                                minHeight: window.innerWidth <= 768 ? '50%' : 'auto',
                                cursor: viewerScale > 1 ? (dragState.current.dragging ? 'grabbing' : 'grab') : 'default',
                                touchAction: 'none',
                                userSelect: 'none'
                            }}
                        >
                            <motion.div
                                animate={{ scale: viewerScale, rotate: viewerRotation, x: viewerPos.x, y: viewerPos.y }}
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <img
                                    src={viewBill.image}
                                    alt="Full Bill"
                                    draggable={false}
                                    style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', pointerEvents: 'none' }}
                                />
                            </motion.div>

                            {/* Floating Controls */}
                            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '8px 15px', borderRadius: '30px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                                <button onClick={() => setViewerScale(s => { const n = Math.max(1, +(s - 0.2).toFixed(2)); if (n === 1) setViewerPos({ x: 0, y: 0 }); return n; })} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Zoom Out"><ZoomOut size={20} /></button>
                                <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 900, minWidth: '40px', textAlign: 'center' }}>{Math.round(viewerScale * 100)}%</span>
                                <button onClick={() => setViewerScale(s => Math.min(4, +(s + 0.2).toFixed(2)))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Zoom In"><ZoomIn size={20} /></button>
                                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
                                <button onClick={() => setViewerRotation(viewerRotation + 90)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Rotate"><RotateCw size={20} /></button>
                                <button onClick={resetViewer} style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>RESET</button>
                            </div>

                            {window.innerWidth <= 768 && (
                                <button onClick={() => { setViewBill(null); resetViewer(); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'white', backdropFilter: 'blur(5px)' }}><X size={24} /></button>
                            )}
                        </div>
                        <div style={{ 
                            width: window.innerWidth <= 768 ? '100%' : '320px', 
                            padding: window.innerWidth <= 480 ? '20px' : '30px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '15px', 
                            overflowY: 'auto' 
                        }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontWeight: 950, fontSize: '1.2rem' }}>Bill Details</h3>
                                {window.innerWidth > 768 && (
                                    <button onClick={() => { setViewBill(null); resetViewer(); }} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Supplier / Title</label>
                                    <p style={{ fontWeight: 800, fontSize: '1rem' }}>{viewBill.title}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Amount Paid</label>
                                    <p style={{ fontWeight: 950, fontSize: '1.2rem', color: '#F7941D' }}>Rs {viewBill.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Date</label>
                                    <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{new Date(viewBill.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Notes</label>
                                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{viewBill.note || 'No notes added to this record.'}</p>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Record ID: #{viewBill.id.toString().slice(-8)}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Operator: {viewBill.created_by || 'System'}</p>
                            </div>
                             {window.innerWidth <= 768 && (
                                <button onClick={() => { setViewBill(null); resetViewer(); }} style={{ width: '100%', padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, marginTop: '10px' }}>CLOSE VIEWER</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillManagement;
