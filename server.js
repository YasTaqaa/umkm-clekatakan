const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE;
const JWT_SECRET = process.env.JWT_SECRET || "super_rahasia_dan_sulit_ditebak_karena_ini_penting";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Konfigurasi Multer
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
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
    limits: { fileSize: 1024 * 1024 * 5 }
});

// File produk
const productsFilePath = path.join(__dirname, 'products.json');

const readProducts = () => {
    try {
        if (!fs.existsSync(productsFilePath)) return [];
        const data = fs.readFileSync(productsFilePath, 'utf8');
        return data.trim() ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Gagal membaca products.json:", error);
        return [];
    }
};

const writeProducts = (products) => {
    try {
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf8');
    } catch (error) {
        console.error("Gagal menulis products.json:", error);
    }
};

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
app.get('/api/products', (req, res) => {
    res.json(readProducts());
});

app.post('/api/products', verifyToken, upload.array('images', 5), (req, res) => {
    const { name, description, contact } = req.body;
    if (!name || !description || !contact || !req.files?.length) {
        return res.status(400).json({ success: false, message: "Semua field wajib diisi dan minimal 1 gambar diunggah." });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    const products = readProducts();
    products.push({ name, description, contact, images: imageUrls });
    writeProducts(products);

    res.json({ success: true, message: "Produk berhasil ditambahkan." });
});

app.delete('/api/products/:index', verifyToken, (req, res) => {
    const index = parseInt(req.params.index, 10);
    const products = readProducts();

    if (isNaN(index) || index < 0 || index >= products.length) {
        return res.status(404).json({ success: false, message: "Indeks produk tidak valid." });
    }

    const product = products.splice(index, 1)[0];
    writeProducts(products);

    if (product.images) {
        product.images.forEach(imageUrl => {
            const imagePath = path.join(__dirname, 'public', imageUrl);
            fs.unlink(imagePath, err => {
                if (err) console.error("Gagal hapus gambar:", err);
            });
        });
    }

    res.json({ success: true, message: "Produk berhasil dihapus." });
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
