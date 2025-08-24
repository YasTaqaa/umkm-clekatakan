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

// Konfigurasi Multer - Updated for multiple files
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
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (jpeg, png, gif) yang diizinkan!'), false);
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 5 
    }
});

// Path file produk
const productsFilePath = path.join(__dirname, 'products.json');

//  membaca dan menulis data produk
const readProducts = () => {
    try {
        if (!fs.existsSync(productsFilePath)) {
            return [];
        }
        const data = fs.readFileSync(productsFilePath, 'utf8');
        if (data.trim() === '') {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error("Gagal membaca atau mem-parse products.json:", error);
        return [];
    }
};

const writeProducts = (products) => {
    try {
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf8');
    } catch (error) {
        console.error("Gagal menulis ke products.json:", error);
    }
};

// Route login
app.post('/api/login', (req, res) => {
    const { code } = req.body;
    if (code === ACCESS_CODE) {
        const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: "Kode salah!" });
    }
});

// Middleware untuk verifikasi token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ message: "Token tidak disediakan." });
    }

    const token = authHeader.split(' ')[1]; 
    if (!token) {
        return res.status(403).json({ message: "Format token salah." });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token tidak valid." });
        }
        req.user = decoded.user;
        next();
    });
};

// Route API mendapatkan, menambah, dan menghapus produk
app.get('/api/products', (req, res) => {
    const products = readProducts();
    res.json(products);
});

// Updated route for multiple images (max 5)
app.post('/api/products', verifyToken, upload.array('images', 5), (req, res) => {
    const { name, description, contact } = req.body;

    if (!name || !description || !contact || !req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "Semua field harus diisi dan minimal 1 gambar harus diunggah." });
    }

    if (req.files.length > 5) {
        return res.status(400).json({ success: false, message: "Maksimal 5 gambar yang dapat diunggah." });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    const newProduct = { name, description, contact, images: imageUrls };
    const products = readProducts();
    products.push(newProduct);
    writeProducts(products);
    res.json({ success: true, message: "Produk berhasil ditambahkan." });
});

app.delete('/api/products/:index', verifyToken, (req, res) => {
    const index = parseInt(req.params.index, 10);
    const products = readProducts();

    if (isNaN(index) || index < 0 || index >= products.length) {
        return res.status(404).json({ success: false, message: "Indeks produk tidak valid." });
    }

    const productToDelete = products[index];

    products.splice(index, 1);
    writeProducts(products);

    // Delete all images associated with the product
    if (productToDelete.images && Array.isArray(productToDelete.images)) {
        productToDelete.images.forEach(imageUrl => {
            if (imageUrl && imageUrl.startsWith('/uploads/')) {
                const imagePath = path.join(__dirname, 'public', imageUrl);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error("Gagal menghapus file gambar:", err);
                    }
                });
            }
        });
    }

    res.json({ success: true, message: "Produk berhasil dihapus." });
});

// Serve halaman statis
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/admin.html'));
});

// Penanganan error global untuk Multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});