const SHEETDB_API = 'https://sheetdb.io/api/v1/ogo8z9ar4h5tb';

// Min date = today
document.getElementById('bookingDate').min = new Date().toISOString().split('T')[0];

// Click-to-copy phone
document.querySelector('p[style*="3rem"]')?.addEventListener('click', () => {
  navigator.clipboard.writeText('+996 552 766 222');
  alert('Copied!');
});

// Only weekends
document.getElementById('bookingDate').addEventListener('input', function () {
  if (this.value) {
    const day = new Date(this.value).getDay();
    if (day !== 0 && day !== 6) {
      alert('We are open only on Saturday and Sunday!');
      this.value = '';
    }
  }
});

// Load booked slots — 100% working version
document.getElementById('bookingDate').addEventListener('change', async function () {
  const date = this.value;
  if (!date) return;

  const select = document.querySelector('select');
  const options = select.options;

  for (let opt of options) if (opt.value) { opt.disabled = false; opt.textContent = opt.value; }

  try {
    const res = await fetch(`${SHEETDB_API}/search?Date=${date}`);
    const result = await res.json();

    if (!result || result.length === 0) return;

    const bookedTimes = result.map(row => row.Time);

    for (let opt of options) {
      if (opt.value && bookedTimes.includes(opt.value)) {
        opt.disabled = true;
        opt.textContent = opt.value + ' (Already Booked)';
      }
    }

    if ([...options].filter(o => o.value && !o.disabled).length === 0) {
      alert('Sorry, all slots are taken for this day. Please choose another weekend.');
    }
  } catch (e) { console.log('SheetDB error → all free'); }
});

// Form submit — works perfectly
document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const name  = this.querySelector('input[type="text"]').value.trim();
  const phone = this.querySelector('input[type="tel"]').value.trim();
  const date  = document.getElementById('bookingDate').value;
  const time  = this.querySelector('select').value;
  const file  = document.getElementById('paymentProof').files[0];

  if (!time || this.querySelector('select').options[this.querySelector('select').selectedIndex].disabled) {
    alert('Please choose an available time slot!');
    return;
  }

  const btn = this.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(SHEETDB_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [{ "Date": date, "Time": time, "Name": name, "Phone": phone }] })
    });
    if (!res.ok) throw await res.text();
  } catch (err) {
    alert('Booking failed – contact Amin on WhatsApp +996 552 766 222');
    btn.disabled = false;
    btn.textContent = 'Complete Booking';
    return;
  }

  const fd = new FormData();
  fd.append('chat_id', '7467542229');
  fd.append('photo', file);
  fd.append('caption', `NEW BOOKING!\nName: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}`);

  fetch('https://api.telegram.org/bot8318354137:AAEY8MGS31QQDHzNAxUZyptB0HgHdnc32Mg/sendPhoto', { method: 'POST', body: fd })
    .then(() => {
      this.classList.add('hidden');
      document.getElementById('successMessage').classList.remove('hidden');
    })
    .catch(() => alert('Booking saved, photo failed'))
    .finally(() => { btn.disabled = false; btn.textContent = 'Complete Booking'; });
});

// OPEN / CLOSED overlay — still here and works!
fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vRaw7cAm6hQXlSYZaHIXzqffVwwT2CSQzIcILoAkgLzSd76u6s4MQqsaTOYGGAOb2wl3ps3ffHCjsbX/pub?output=csv")
  .then(r => r.text())
  .then(text => {
    if (text.trim().toUpperCase() === 'CLOSED') {
      document.getElementById('closedOverlay').style.display = 'block';
      document.body.style.overflow = 'hidden';
      document.querySelector('header').style.visibility = 'hidden';
      document.querySelectorAll('section, footer').forEach(el => el.style.display = 'none');
    }
  });