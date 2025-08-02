document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin';
    }
    loadAdminProducts();
});

document.getElementById("product-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const token = localStorage.getItem('adminToken');

    const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
            'Authorization': token
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

async function loadAdminProducts() {
    const list = document.getElementById("product-list");
    const response = await fetch('/api/products');
    const data = await response.json();

    list.innerHTML = "";
    data.forEach((product, index) => {
        const li = document.createElement("li");
        // Perbaikan: Menampilkan deskripsi alih-alih kategori
        li.innerHTML = `
            <strong>${product.name}</strong> - ${product.description.substring(0, 50)}...
            <button onclick="deleteProduct(${index})" style="margin-left: 10px;">🗑️</button>
        `;
        list.appendChild(li);
    });
}

async function deleteProduct(index) {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`/api/products/${index}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token
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