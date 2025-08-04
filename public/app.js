const productList = document.getElementById("product-cards");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
let allProducts = [];

// Fungsi untuk memeriksa apakah URL gambar valid
function isValidImageUrl(url) {
  return (
    /^https?:\/\//.test(url) ||
    url.startsWith('/uploads/')
  );
}

// Fungsi untuk merender produk ke DOM (Halaman Index)
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

    const imageUrl = product.image;

    const imageTag = isValidImageUrl(imageUrl)
      ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/><div class="no-image" style="display: none;">[Gambar tidak dapat dimuat]</div>`
      : `<div class="no-image">[Gambar tidak tersedia]</div>`;

    card.innerHTML = `
      ${imageTag}
      <div class="card-content">
        <h3>${product.name}</h3>
      </div>
    `;
    productList.appendChild(card);
  });
}

// Fungsi untuk menampilkan modal detail produk
function showProductModal(product) {
    const modal = document.getElementById("product-modal");
    const modalImage = document.getElementById("modal-image");
    const modalName = document.getElementById("modal-name");
    const modalDescription = document.getElementById("modal-description");
    const modalContact = document.getElementById("modal-contact");
    const closeButton = document.querySelector(".close-button");

    modalImage.src = product.image;
    modalImage.alt = product.name;
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

// Fungsi untuk mengambil produk (Halaman Index)
async function loadProducts() {
  if (!productList) return;

  const response = await fetch('/api/products');
  const data = await response.json();
  allProducts = data;
  
  renderProducts(allProducts);
}

// Fungsi pencarian (Halaman Index)
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredProducts = allProducts.filter(product => {
    return product.name.toLowerCase().includes(searchTerm) ||
           product.description.toLowerCase().includes(searchTerm);
  });
  renderProducts(filteredProducts);
}

// --- Kode untuk Halaman Admin Panel ---
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

    data.forEach((product, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${product.name}</strong> - ${product.description.substring(0, 50)}...
            <button class="delete-btn" data-index="${index}" style="margin-left: 10px;">🗑️</button>
        `;
        list.appendChild(li);
    });

    // Menambahkan event listener untuk tombol hapus setelah list dibuat
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            deleteProduct(index);
        });
    });
}

async function deleteProduct(index) {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`/api/products/${index}`, {
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
    window.location.href = '/admin';
}

// --- Kode untuk Halaman Login ---
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

// Inisialisasi semua event listener setelah DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi untuk halaman index.html
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        const searchInput = document.getElementById("search-input");
        const searchButton = document.getElementById("search-button");
        const clearButton = document.getElementById("clear-button");

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
                loadProducts(); // Memuat ulang semua produk dari server
            });
        }
        loadProducts();
    }

    // Inisialisasi untuk halaman login.html
    else if (window.location.pathname === '/admin' || window.location.pathname.includes('login.html')) {
        const loginButton = document.getElementById("login-button");
        const accessCodeInput = document.getElementById("access-code");

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
    }

    // Inisialisasi untuk halaman admin.html
    else if (window.location.pathname === '/admin-panel' || window.location.pathname.includes('admin.html')) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/admin';
        }
        loadAdminProducts();

        const productForm = document.getElementById("product-form");
        if (productForm) {
            productForm.addEventListener("submit", async function (e) {
                e.preventDefault();

                const form = e.target;
                const formData = new FormData(form);

                const token = localStorage.getItem('adminToken');
                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });

                const data = await response.json();
                if (data.success) {
                    this.reset();
                    loadAdminProducts();
                } else {
                    alert(data.message);
                }
            });
        }

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', logout);
        }
    }
});