const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE;
const JWT_SECRET = process.env.JWT_SECRET || "super_rahasia_dan_sulit_ditebak_karena_ini_penting";

// Koneksi ke MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Terhubung ke MongoDB!"))
    .catch(err => console.error("Koneksi MongoDB gagal:", err));

// Konfigurasi Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Skema Mongoose untuk produk
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    contact: { type: String, required: true },
    images: [{ type: String, required: true }],
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Konfigurasi Cloudinary Storage untuk Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'umkm-clekatakan',
        format: async (req, file) => 'png',
        public_id: (req, file) => `${file.originalname}-${Date.now()}`
    },
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (jpeg, png, gif) yang diizinkan!'), false);
        }
    },
    limits: { fileSize: 1024 * 1024 * 10 } // Batas ukuran file diubah menjadi 10MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Login
app.post('/api/login', (req, res) => {
    const { code } = req.body;
    if (code === ACCESS_CODE) {
        const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: "Kode salah!" });
    }
});

// Middleware auth
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ message: "Token tidak disediakan." });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ message: "Format token salah." });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token tidak valid." });
        req.user = decoded.user;
        next();
    });
};

// API Produk
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil produk." });
    }
});

app.post('/api/products', verifyToken, upload.array('images', 5), async (req, res) => {
    const { name, description, contact } = req.body;
    if (!name || !description || !contact || !req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "Semua field wajib diisi dan minimal 1 gambar diunggah." });
    }
    
    // Hapus file sementara yang mungkin dibuat oleh multer (jika ada)
    req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });

    const imageUrls = req.files.map(file => file.path); // Cloudinary URL ada di `file.path`

    const newProduct = new Product({
        name,
        description,
        contact,
        images: imageUrls
    });

    try {
        await newProduct.save();
        res.status(201).json({ success: true, message: "Produk berhasil ditambahkan." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Gagal menyimpan produk." });
    }
});

app.delete('/api/products/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
        }
        
        // Hapus gambar dari Cloudinary
        for (const imageUrl of product.images) {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`umkm-clekatakan/${publicId}`);
        }

        res.json({ success: true, message: "Produk berhasil dihapus." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Gagal menghapus produk." });
    }
});

// Halaman statis
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'views/admin.html')));

// Error handler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// 🔑 Penting: export app untuk Vercel
module.exports = app;

// Kalau dijalankan lokal
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}