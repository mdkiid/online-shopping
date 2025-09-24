// frontend/js/app.js
const API_BASE = 'http://localhost:3000/api';

// 获取最新商品
async function loadLatestProduct() {
    try {
        const response = await fetch(`${API_BASE}/products/latest`);
        const data = await response.json();
        
        const productInfo = document.getElementById('product-info');
        if (data.product) {
            productInfo.innerHTML = `
                <h2>${data.product.name}</h2>
                <p>${data.product.description}</p>
                <p>价格: ¥${data.product.price}</p>
                <button onclick="showCheckout()">购买</button>
            `;
            document.getElementById('checkout-form').style.display = 'block';
        } else {
            productInfo.innerHTML = '<p>暂无商品</p>';
        }
    } catch (error) {
        console.error('获取商品失败:', error);
        document.getElementById('product-info').innerHTML = '<p>加载失败</p>';
    }
}

// 显示购买表单
function showCheckout() {
    document.getElementById('checkout-form').style.display = 'block';
}

// 处理购买
document.getElementById('checkout').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    
    try {
        const response = await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone })
        });
        
        const data = await response.json();
        const resultDiv = document.getElementById('result');
        
        if (data.success) {
            resultDiv.innerHTML = '<p style="color: green;">订单创建成功!</p>';
            document.getElementById('checkout-form').style.display = 'none';
        } else {
            resultDiv.innerHTML = `<p style="color: red;">错误: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('购买失败:', error);
        document.getElementById('result').innerHTML = '<p style="color: red;">购买失败</p>';
    }
});

// 页面加载时获取商品
loadLatestProduct();