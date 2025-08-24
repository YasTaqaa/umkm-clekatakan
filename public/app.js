import imageCompression from 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js';

const productList = document.getElementById("product-cards");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
let allProducts = [];

// memeriksa apakah URL gambar valid
function isValidImageUrl(url) {
  return (
    /^https?:\/\//.test(url) ||
    url.startsWith('/uploads/')
  );
}

// merender produk ke DOM 
function renderProducts(productsToRender) {
  if (!productList) return;

  productList.innerHTML = "";

  if (productsToRender.length === 0) {
    productList.innerHTML = "<p class='no-products'>Tidak ada produk yang ditemukan.</p>";
    return;
  }

  productsToRender.forEach((product) => {
    const card = document.createElement("div");
    card.className = "card";
    card.addEventListener('click', () => showProductModal(product));

    // Handle multiple images - show first image or fallback
    let imageTag;
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      imageTag = isValidImageUrl(firstImage)
        ? `<img src="${firstImage}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/><div class="no-image" style="display: none;">[Gambar tidak dapat dimuat]</div>`
        : `<div class="no-image">[Gambar tidak tersedia]</div>`;
    } else if (product.image) {
      // Backward compatibility with single image
      imageTag = isValidImageUrl(product.image)
        ? `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/><div class="no-image" style="display: none;">[Gambar tidak dapat dimuat]</div>`
        : `<div class="no-image">[Gambar tidak tersedia]</div>`;
    } else {
      imageTag = `<div class="no-image">[Gambar tidak tersedia]</div>`;
    }

    card.innerHTML = `
      ${imageTag}
      <div class="card-content">
        <h3>${product.name}</h3>
      </div>
    `;
    productList.appendChild(card);
  });
}

// menampilkan modal detail produk dengan multiple images
function showProductModal(product) {
    const modal = document.getElementById("product-modal");
    const modalImageContainer = document.getElementById("modal-image-container");
    const modalName = document.getElementById("modal-name");
    const modalDescription = document.getElementById("modal-description");
    const modalContact = document.getElementById("modal-contact");
    const closeButton = document.querySelector(".close-button");

    // Clear previous images
    modalImageContainer.innerHTML = "";

    // Handle multiple images
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // Create image gallery
        const imageGallery = document.createElement("div");
        imageGallery.className = "image-gallery";
        
        // Main image display
        const mainImageDiv = document.createElement("div");
        mainImageDiv.className = "main-image";
        const mainImage = document.createElement("img");
        mainImage.src = product.images[0];
        mainImage.alt = product.name;
        mainImage.id = "main-modal-image";
        mainImageDiv.appendChild(mainImage);
        
        // Thumbnails container (only show if more than 1 image)
        if (product.images.length > 1) {
            const thumbnailsDiv = document.createElement("div");
            thumbnailsDiv.className = "image-thumbnails";
            
            product.images.forEach((imageUrl, index) => {
                const thumbnail = document.createElement("img");
                thumbnail.src = imageUrl;
                thumbnail.alt = `${product.name} - Image ${index + 1}`;
                thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
                thumbnail.onclick = () => {
                    mainImage.src = imageUrl;
                    // Update active thumbnail
                    thumbnailsDiv.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumbnail.classList.add('active');
                };
                thumbnailsDiv.appendChild(thumbnail);
            });
            
            imageGallery.appendChild(mainImageDiv);
            imageGallery.appendChild(thumbnailsDiv);
        } else {
            imageGallery.appendChild(mainImageDiv);
        }
        
        modalImageContainer.appendChild(imageGallery);
    } else if (product.image) {
        // Backward compatibility with single image
        const singleImage = document.createElement("img");
        singleImage.src = product.image;
        singleImage.alt = product.name;
        singleImage.className = "single-modal-image";
        modalImageContainer.appendChild(singleImage);
    }

    modalName.textContent = product.name;
    modalDescription.textContent = product.description;
    modalContact.innerHTML = `
      <i class="fab fa-whatsapp wa-icon"></i> 
      ${product.contact}
    `;

    modal.style.display = "flex";

    closeButton.onclick = () => {
        modal.style.display = "none";
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };
}

// mengambil produk
async function loadProducts() {
  if (!productList) return;

  const response = await fetch('/api/products');
  const data = await response.json();
  allProducts = data;
  
  renderProducts(allProducts);
}

// Pencarian
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredProducts = allProducts.filter(product => {
    return product.name.toLowerCase().includes(searchTerm) ||
           product.description.toLowerCase().includes(searchTerm);
  });
  renderProducts(filteredProducts);
}

// Admin Panel
async function loadAdminProducts() {
    const list = document.getElementById("product-list");
    if (!list) return;

    const response = await fetch('/api/products');
    const data = await response.json();

    list.innerHTML = "";
    if (data.length === 0) {
        list.innerHTML = "<p>Tidak ada produk yang ditambahkan.</p>";
        return;
    }

    data.forEach((product) => {
        const li = document.createElement("li");
        const imageCount = product.images ? product.images.length : 0;
        li.innerHTML = `
            <div class="product-info">
                <strong>${product.name}</strong> - ${product.description.substring(0, 50)}...
                <br><small>${imageCount} gambar</small>
            </div>
            <button class="delete-btn" data-id="${product._id}" style="margin-left: 10px;">🗑️</button>
        `;
        list.appendChild(li);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

async function deleteProduct(productId) {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    if (data.success) {
        loadAdminProducts();
    } else {
        alert(data.message);
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/'; // Mengubah redirect ke halaman utama
}

// Halaman Login 
async function handleLogin() {
    const code = document.getElementById("access-code").value.trim();
    const messageElement = document.getElementById("message");
    messageElement.textContent = '';
    messageElement.className = 'message';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('adminToken', data.token);
            window.location.href = '/admin-panel';
        } else {
            messageElement.textContent = data.message;
            messageElement.className = 'message error';
        }
    } catch (error) {
        messageElement.textContent = 'Terjadi kesalahan saat menghubungi server.';
        messageElement.className = 'message error';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi index.html
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        const searchInput = document.getElementById("search-input");
        const searchButton = document.getElementById("search-button");
        const clearButton = document.getElementById("clear-button");
        const tambahProdukLink = document.getElementById("tambah-produk-link");
        const token = localStorage.getItem('adminToken');

        if (tambahProdukLink && token) {
            tambahProdukLink.href = '/admin-panel';
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', handleSearch);
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    handleSearch();
                }
            });
        }
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                loadProducts(); 
            });
        }
        loadProducts();
    }

    // Inisialisasi login.html
    else if (window.location.pathname === '/admin' || window.location.pathname.includes('login.html')) {
        const loginButton = document.getElementById("login-button");
        const accessCodeInput = document.getElementById("access-code");
        const togglePassword = document.getElementById('toggle-password');

        if (loginButton) {
            loginButton.addEventListener('click', handleLogin);
        }
        if (accessCodeInput) {
            accessCodeInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    handleLogin();
                }
            });
        }
        if (togglePassword && accessCodeInput) {
          togglePassword.addEventListener('click', function (e) {
            const type = accessCodeInput.getAttribute('type') === 'password' ? 'text' : 'password';
            accessCodeInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
          });
        }
    }

    // Inisialisasi admin.html
    else if (window.location.pathname === '/admin-panel' || window.location.pathname.includes('admin.html')) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/admin';
        }
        loadAdminProducts();

        const productForm = document.getElementById("product-form");
        const imageInput = document.getElementById("images");
        const submitButton = productForm.querySelector('.btn-tambah');
        
        // Add file validation for multiple images
        if (imageInput) {
            imageInput.addEventListener('change', function(e) {
                const files = e.target.files;
                if (files.length > 5) {
                    alert('Maksimal 5 gambar yang dapat dipilih!');
                    e.target.value = ''; // Clear the selection
                    return;
                }
                
                // Optional: Show file count feedback
                const fileInfo = document.querySelector('.file-info small');
                if (fileInfo) {
                    fileInfo.textContent = files.length > 0 
                        ? `${files.length} gambar dipilih. Format yang didukung: JPEG, PNG, GIF`
                        : 'Pilih 1-5 gambar. Format yang didukung: JPEG, PNG, GIF';
                }
            });
        }

        if (productForm) {
            productForm.addEventListener("submit", async function (e) {
                e.preventDefault();

                // Tampilkan loading dan nonaktifkan tombol
                submitButton.disabled = true;
                submitButton.innerHTML = 'Memproses...';
                submitButton.classList.add('loading');

                const formData = new FormData();
                
                const imageFiles = imageInput.files;
                const compressedFiles = [];
                const compressionOptions = {
                    maxSizeMB: 1, // Ukuran maksimal file setelah kompresi (dalam MB)
                    maxWidthOrHeight: 1920, // Dimensi maksimal
                    useWebWorker: true
                };

                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    try {
                        const compressedFile = await imageCompression(file, compressionOptions);
                        compressedFiles.push(compressedFile);
                    } catch (error) {
                        // Sembunyikan loading dan aktifkan kembali tombol
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Tambah Produk';
                        submitButton.classList.remove('loading');
                        alert('Gagal mengompres gambar. Coba lagi.');
                        console.error('Kompresi gambar gagal:', error);
                        return;
                    }
                }

                for (let i = 0; i < compressedFiles.length; i++) {
                    formData.append('images', compressedFiles[i], compressedFiles[i].name);
                }

                const token = localStorage.getItem('adminToken');
                
                try {
                    const response = await fetch('/api/products', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData,
                    });

                    // Periksa apakah respons dari server tidak oke (misalnya, status 400 atau 500)
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Terjadi kesalahan pada server. Coba lagi.');
                    }

                    const data = await response.json();

                    // Sembunyikan loading dan aktifkan kembali tombol
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Tambah Produk';
                    submitButton.classList.remove('loading');

                    if (data.success) {
                        this.reset();
                        const fileInfo = document.querySelector('.file-info small');
                        if (fileInfo) {
                            fileInfo.textContent = 'Pilih 1-5 gambar. Format yang didukung: JPEG, PNG, GIF';
                        }
                        loadAdminProducts();
                        alert('Produk berhasil ditambahkan!');
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    // Sembunyikan loading dan aktifkan kembali tombol
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Tambah Produk';
                    submitButton.classList.remove('loading');
                    
                    // Tampilkan pesan error yang lebih spesifik
                    alert('Gagal mengunggah: ' + error.message);
                    console.error('Error:', error);
                }
            });
        }

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', logout);
        }
    }
});