(() => {
  const PAYMENT_API_BASE = "https://nandini-gift-collection-1.onrender.com";
  const DIWALI_PRODUCTS = [
    ["mala-orange-yellow","Decorative Mala Pack — Orange & Yellow",149,"Pack of 5 pieces","images/diwali/mala-orange-yellow.webp"],
    ["mala-orange-white","Decorative Mala Pack — Orange & White",149,"Pack of 5 pieces","images/diwali/mala-orange-white.webp"],
    ["flower-jhoomar-marigold","Flower Jhoomar — Marigold",199,"Each","images/diwali/flower-jhoomar-marigold.webp"],
    ["flower-jhoomar-marigold-jasmine","Flower Jhoomar — Marigold & Jasmine",199,"Each","images/diwali/flower-jhoomar-marigold-jasmine.webp"],
    ["led-water-diya-set","LED Water Diya Set",299,"Per box","images/diwali/led-water-diya-set.webp"],
    ["led-diyas-box","LED Diya Lights — Festive Box",299,"Per box","images/diwali/led-diyas-box.webp"],
    ["marigold-toran","Decorative Toran — Marigold",199,"Each","images/diwali/marigold-toran.webp"],
    ["handmade-bandhanwar","Bandhanwar — Traditional Style",199,"Each","images/diwali/handmade-bandhanwar.webp"],
    ["multicolor-gerbera-bunch","Artificial Flower Bunch — Gerbera",129,"Each","images/diwali/multicolor-gerbera-bunch.webp"],
    ["multicolor-flower-bunch","Artificial Flower Bunch — Mixed Flowers",129,"Each","images/diwali/multicolor-flower-bunch.webp"]
  ].map(([id,name,price,unit,image]) => ({id,name,price,unit,image,fixedPrice:true}));

  const existing = [...document.querySelectorAll(".shop-gallery figure")].map((figure,index) => {
    const caption = figure.querySelector("figcaption");
    const priceText = caption?.querySelector(".diwali-tag")?.textContent || "";
    const image = figure.querySelector("img");
    const nameNode = caption?.cloneNode(true);
    nameNode?.querySelectorAll(".diwali-tag").forEach(n => n.remove());
    const match = priceText.match(/[0-9][0-9,]*/);
    return {id:`existing-${index}`,name:nameNode?.textContent.trim()||"Gift item",price:match?Number(match[0].replaceAll(",","")):0,unit:"starting price",image:image?.getAttribute("src")||"",fixedPrice:false};
  }).filter(p => p.price && p.image);
  const KIDS_PRODUCTS = [["elephant-toy","Battery-Operated Elephant Toy",399,"Each","images/elephant-toy.jpg"]].map(([id,name,price,unit,image]) => ({id,name,price,unit,image,fixedPrice:true}));
  const ALL_PRODUCTS = [...existing,...DIWALI_PRODUCTS,...KIDS_PRODUCTS];
  const byId = new Map(ALL_PRODUCTS.map(p => [p.id,p]));

  const styleButton = button => {
    const rules = {
      display:"block", visibility:"visible", opacity:"1", position:"relative", zIndex:"20",
      width:"calc(100% - 24px)", minHeight:"46px", height:"auto", margin:"10px 12px 14px",
      padding:"12px 16px", border:"0", borderRadius:"999px", cursor:"pointer",
      background:"linear-gradient(130deg,#8e205d,#c92768,#e98225)", color:"#fff",
      fontSize:"15px", fontWeight:"900", lineHeight:"1.2", boxShadow:"0 5px 16px rgba(99,33,65,.22)"
    };
    for (const [k,v] of Object.entries(rules)) button.style.setProperty(k.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`),v,"important");
  };

  function ensureButtons(){
    document.querySelectorAll(".shop-gallery figure").forEach((figure,index) => {
      let button = figure.querySelector(".existing-product-add");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "diwali-add existing-product-add";
        button.dataset.productId = `existing-${index}`;
        button.textContent = "Add to Cart";
        figure.append(button);
      }
      styleButton(button);
      figure.style.setProperty("overflow","visible","important");
      figure.style.setProperty("height","auto","important");
    });
    document.querySelectorAll(".diwali-product-card .diwali-add").forEach(styleButton);
    document.querySelectorAll(".diwali-product-info").forEach(info => {
      info.style.setProperty("display","block","important");
      info.style.setProperty("visibility","visible","important");
      info.style.setProperty("opacity","1","important");
      info.style.setProperty("height","auto","important");
      info.style.setProperty("overflow","visible","important");
    });
    document.querySelectorAll(".diwali-product-card").forEach(card => card.style.setProperty("height","auto","important"));
  }
  ensureButtons();
  setTimeout(ensureButtons,300);
  setTimeout(ensureButtons,1200);

  const cartKey="nandini-gift-cart-v1";
  let cart={};
  try { cart=JSON.parse(localStorage.getItem(cartKey)||"{}"); } catch { cart={}; }
  const save=()=>{try{localStorage.setItem(cartKey,JSON.stringify(cart));}catch{}};
  const selected=()=>ALL_PRODUCTS.filter(p=>cart[p.id]>0);

  const cartButton=document.createElement("button");
  cartButton.type="button"; cartButton.className="diwali-cart-button";
  cartButton.innerHTML='🛒 <span>Cart</span> <b class="diwali-cart-count">0</b>';
  document.body.append(cartButton);

  const dialog=document.createElement("dialog");
  dialog.className="diwali-cart-dialog";
  dialog.innerHTML='<div class="diwali-cart-head"><div><p class="diwali-eyebrow">NANDINI GIFT COLLECTION</p><h2>Your Shopping Cart</h2></div><button class="diwali-cart-close" type="button" aria-label="Close cart">×</button></div><div class="diwali-cart-items"></div><p class="diwali-cart-empty">Your cart is empty. Add products to get started.</p><div class="diwali-cart-summary"><p class="diwali-cart-total">Subtotal: ₹0</p><label class="diwali-pin-label" for="diwali-pin-code">Delivery PIN code (India)</label><input class="diwali-pin-code" id="diwali-pin-code" inputmode="numeric" maxlength="6" placeholder="6-digit PIN code"><small class="diwali-payment-note">Online payment will be available shortly. You can place your order now through WhatsApp.</small><p class="diwali-payment-status" role="status" aria-live="polite"></p><button class="diwali-pay-button" type="button" disabled>Pay with Razorpay</button><button class="diwali-checkout" type="button" disabled>Order on WhatsApp</button></div>';
  document.body.append(dialog);
  const list=dialog.querySelector(".diwali-cart-items"), empty=dialog.querySelector(".diwali-cart-empty"), total=dialog.querySelector(".diwali-cart-total"), count=cartButton.querySelector(".diwali-cart-count"), wa=dialog.querySelector(".diwali-checkout"), pay=dialog.querySelector(".diwali-pay-button"), pin=dialog.querySelector(".diwali-pin-code"), status=dialog.querySelector(".diwali-payment-status");
  let paymentConfig={enabled:false,keyId:null};

  function render(){
    list.replaceChildren(); let subtotal=0,itemCount=0;
    selected().forEach(p=>{
      const q=Number(cart[p.id])||0; subtotal+=p.price*q; itemCount+=q;
      const row=document.createElement("article"); row.className="diwali-cart-row";
      row.innerHTML=`<img src="${p.image}" alt="" width="58" height="58"><div class="diwali-cart-row-info"><strong>${p.name}</strong><span>₹${p.price} ${p.unit}</span></div><div class="diwali-cart-controls"><button type="button" data-action="minus" data-id="${p.id}">−</button><span>${q}</span><button type="button" data-action="plus" data-id="${p.id}">+</button><button type="button" data-action="remove" data-id="${p.id}">Remove</button></div>`;
      list.append(row);
    });
    count.textContent=String(itemCount); empty.hidden=itemCount>0; total.textContent=`Subtotal: ₹${subtotal}`; wa.disabled=itemCount===0;
    const fixed=selected().length>0&&selected().every(p=>p.fixedPrice);
    pay.disabled=itemCount===0||!paymentConfig.enabled||!fixed; save(); ensureButtons();
  }

  async function loadConfig(){
    try { const r=await fetch(`${PAYMENT_API_BASE}/api/config`); paymentConfig=await r.json(); status.textContent=paymentConfig.enabled?"Secure online payment is available for fixed-price products.":"Online payment is not activated. Please order on WhatsApp."; }
    catch { status.textContent="Online payment is temporarily unavailable. Please order on WhatsApp."; }
    render();
  }
  function loadRazorpay(){return new Promise((resolve,reject)=>{if(window.Razorpay)return resolve();const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=resolve;s.onerror=reject;document.head.append(s);});}
  async function payNow(){
    const items=selected(); if(!items.length||items.some(p=>!p.fixedPrice)||!paymentConfig.enabled)return;
    if(!/^\d{6}$/.test(pin.value.trim())){status.textContent="Enter a valid 6-digit delivery PIN code.";pin.focus();return;}
    try{
      pay.disabled=true; status.textContent="Preparing secure checkout…";
      const payload=items.map(p=>({id:p.id,quantity:cart[p.id]}));
      const r=await fetch(`${PAYMENT_API_BASE}/api/razorpay/order`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({items:payload,pinCode:pin.value.trim()})});
      const order=await r.json(); if(!r.ok)throw new Error(order.error||"Could not start payment."); await loadRazorpay();
      const checkout=new Razorpay({key:order.keyId,order_id:order.orderId,amount:order.amount,currency:order.currency,name:"Nandini Gift Collection",description:"Gift order (delivery extra)",handler:async result=>{
        status.textContent="Verifying payment…";
        const vr=await fetch(`${PAYMENT_API_BASE}/api/razorpay/verify`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({orderId:result.razorpay_order_id,paymentId:result.razorpay_payment_id,signature:result.razorpay_signature,items:payload})});
        const v=await vr.json(); if(vr.ok&&v.verified){cart={};render();status.textContent="Payment captured. Please confirm delivery details on WhatsApp.";}else status.textContent=v.error||"Payment verification failed. Please contact the shop.";
      }}); checkout.open();
    }catch(e){status.textContent=e.message||"Payment unavailable. Please order on WhatsApp.";}finally{render();}
  }

  document.addEventListener("click",e=>{
    const add=e.target.closest(".diwali-add");
    if(add){const p=byId.get(add.dataset.productId);if(!p)return;cart[p.id]=(Number(cart[p.id])||0)+1;render();add.textContent="Added ✓";setTimeout(()=>{if(add.isConnected)add.textContent="Add to Cart";},900);return;}
    const c=e.target.closest("[data-action]"); if(!c)return; const id=c.dataset.id;
    if(c.dataset.action==="plus")cart[id]=(Number(cart[id])||0)+1; else if(c.dataset.action==="minus"){cart[id]=(Number(cart[id])||0)-1;if(cart[id]<=0)delete cart[id];} else delete cart[id]; render();
  });
  cartButton.addEventListener("click",()=>dialog.showModal());
  dialog.querySelector(".diwali-cart-close").addEventListener("click",()=>dialog.close());
  pin.addEventListener("input",()=>pin.value=pin.value.replace(/\D/g,"").slice(0,6));
  pay.addEventListener("click",payNow);
  wa.addEventListener("click",()=>{
    const lines=selected().map(p=>`${p.name} × ${cart[p.id]} = ₹${p.price*cart[p.id]}`);
    const subtotal=selected().reduce((s,p)=>s+p.price*cart[p.id],0);
    const text=`Hello Nandini Gift Collection, I want to order:\n\n${lines.join("\n")}\n\nSubtotal: ₹${subtotal}\nDelivery PIN: ${pin.value.trim()||"Not entered"}\nPlease confirm availability and delivery charges.`;
    window.open(`https://wa.me/918266814556?text=${encodeURIComponent(text)}`,"_blank","noopener");
  });
  render(); loadConfig();
})();