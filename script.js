const SHEETDB_API = 'https://sheetdb.io/api/v1/ogo8z9ar4h5tb';

// Min date = today (strictly no past dates)
const today = new Date().toISOString().split('T')[0];
document.getElementById('bookingDate').min = today;
document.getElementById('bookingDate').value = '';  

// Haircut slots (Sat–Sun) – 90 minutes each, lunch excluded (12-13:30)
const haircutSlots = [
  "10:00 – 11:30",
  "11:30 – 13:00",
  "14:00 – 15:30",
  "15:30 – 17:00"
];

// Beard slots (Friday only) – every 20 minutes, lunch break 12:00–13:30 excluded
const beardSlots = [];
const start = 10 * 60;  // 10:00
const end   = 18 * 60;  // 18:00
const lunchStart = 12 * 60;
const lunchEnd   = 13.5 * 60;

for (let mins = start; mins < end; mins += 20) {
  if (mins >= lunchStart && mins < lunchEnd) continue;
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  const h2 = Math.floor((mins + 20) / 60).toString().padStart(2, '0');
  const m2 = ((mins + 20) % 60).toString().padStart(2, '0');
  beardSlots.push(`${h}:${m} – ${h2}:${m2}`);
}

// Validate and update time slots based on service + day
function updateTimeSlots() {
  const dateInput = document.getElementById('bookingDate');
  const serviceSelect = document.getElementById('serviceType');
  const timeSelect = document.getElementById('timeSelect');
  const selectedDate = dateInput.value;
  const service = serviceSelect.value;

  // Clear times if no date/service
  if (!selectedDate || !service) {
    timeSelect.innerHTML = '<option value="" disabled selected>Select time (choose service + date first)</option>';
    return;
  }

  // Block past dates
  if (selectedDate < today) {
    alert('Cannot book in the past! Choose today or future.');
    dateInput.value = '';
    timeSelect.innerHTML = '<option value="" disabled selected>Invalid date</option>';
    return;
  }

  const selectedDay = new Date(selectedDate).getDay(); // 0=Sun, 5=Fri, 6=Sat

  let availableSlots = [];
  let isValidDay = false;

  if (service === "haircut") {
    if (selectedDay === 6 || selectedDay === 0) {  // Sat or Sun
      availableSlots = haircutSlots;
      isValidDay = true;
    }
  } else if (service === "beard") {
    if (selectedDay === 5) {  // Fri
      availableSlots = beardSlots;
      isValidDay = true;
    }
  }

  if (!isValidDay) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[selectedDay];
    alert(`Invalid day for ${service === 'haircut' ? 'haircut' : 'beard service'}! Only ${service === 'haircut' ? 'Saturday/Sunday' : 'Friday'} allowed. (${dayName} selected)`);
    dateInput.value = '';
    timeSelect.innerHTML = '<option value="" disabled selected>Choose a valid day</option>';
    return;
  }

  // Populate times
  timeSelect.innerHTML = '<option value="" disabled selected>Select time</option>';
  availableSlots.forEach(slot => {
    const opt = document.createElement('option');
    opt.value = slot;
    opt.textContent = slot;
    timeSelect.appendChild(opt);
  });

  // Load and disable booked slots
  loadBookedSlots(selectedDate, timeSelect);
}

// Load booked slots from SheetDB (prevents duplicates)
async function loadBookedSlots(date, selectElement) {
  try {
    const res = await fetch(`${SHEETDB_API}/search?Date=${date}`);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    const bookedTimes = data.map(row => row.Time);  // Assumes "Time" column in Sheet

    Array.from(selectElement.options).forEach(opt => {
      if (opt.value && bookedTimes.includes(opt.value)) {
        opt.disabled = true;
        opt.textContent = `${opt.value} (Booked)`;
      }
    });

    const availableCount = Array.from(selectElement.options).filter(o => o.value && !o.disabled).length;
    if (availableCount === 0) {
      alert('All slots taken for this day. Pick another.');
      // Optionally clear date: dateInput.value = '';
    }
  } catch (e) {
    console.log('SheetDB fetch error – treating all as available');
  }
}

// Event listeners: Trigger on service or date change
document.getElementById('serviceType').addEventListener('change', updateTimeSlots);
document.getElementById('bookingDate').addEventListener('change', updateTimeSlots);

// Also validate on date input (for manual typing)
document.getElementById('bookingDate').addEventListener('input', function() {
  if (this.value < today) {
    this.value = today;  // Snap to today
  }
  updateTimeSlots();  // Re-validate
});

// Form submit (sends service too, prevents invalid submits)
document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name   = this.querySelector('input[type="text"]').value.trim();
  const phone  = this.querySelector('input[type="tel"]').value.trim();
  const date   = document.getElementById('bookingDate').value;
  const time   = document.getElementById('timeSelect').value;
  const service= document.getElementById('serviceType').value;
  const file   = document.getElementById('paymentProof').files[0];

  if (!name || !phone || !date || !time || !service || !file) {
    alert('Fill all fields, including payment screenshot!');
    return;
  }

  if (document.getElementById('timeSelect').selectedOptions[0].disabled) {
    alert('This time is already booked! Choose another.');
    return;
  }

  const price = service === "haircut" ? "400 KGS" : "100 KGS";
  const serviceText = service === "haircut" ? "Men's Haircut" : "Beard Trim + Line-up";

  const btn = this.querySelector('button');
  btn.disabled = true;
  btn.textContent = "Sending...";

  // Save to SheetDB (includes Service to track)
  try {
    const res = await fetch(SHEETDB_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        data: [{ 
          Date: date, 
          Time: time, 
          Name: name, 
          Phone: phone, 
          Service: serviceText 
        }] 
      })
    });
    if (!res.ok) throw new Error(await res.text());
  } catch (err) {
    alert('Booking save failed – contact Amin on WhatsApp +996 552 766 222');
    btn.disabled = false;
    btn.textContent = "Complete Booking";
    return;
  }

  // Send to Telegram
  const fd = new FormData();
  fd.append('chat_id', '7467542229');
  fd.append('photo', file);
  fd.append('caption', `NEW BOOKING!\nService: ${serviceText}\nPrice: ${price}\nName: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}`);

  fetch('https://api.telegram.org/bot8318354137:AAEY8MGS31QQDHzNAxUZyptB0HgHdnc32Mg/sendPhoto', { method: 'POST', body: fd })
    .then(() => {
      this.style.display = 'none';  // Hide form
      document.getElementById('successMessage').classList.remove('hidden');
    })
    .catch(() => alert('Booking saved to sheet, but Telegram photo failed – we still got your details!'))
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "Complete Booking";
    });
});

// Closed overlay (unchanged)
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