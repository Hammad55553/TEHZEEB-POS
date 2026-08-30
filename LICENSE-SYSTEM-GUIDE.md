# License / Remote Control System — Guide (Tehzeeb POS)

Aap har shop ko POS bech kar door se control kar sakte hain: lock/unlock,
expiry, aur update on/off. Sab kuch ek file se: `licenses.json` (GitHub par).

## License Key Format
Har key aise banayein: `TZB-0001-ASPER-AITPL`
- `TZB`          = product (Tehzeeb POS)
- `0001`         = shop number (0001, 0002, 0003 ... har shop ka alag)
- `ASPER-AITPL`  = aapki company (Asper AITPL)
Yeh format unique + guess-proof hai, aur har key par aapki company ka naam hota hai.

## 1. Har nayi shop ko install karte waqt
- Us shop ke liye ek unique **license key** chunein, e.g. `SHOP-ALI-01`.
- Us key ko ek file mein likhein: **`license.key`** (sirf key text, aur kuch nahi).
- Yeh file app ke saath rakhें:
  - Production (installed EXE): app ke **resources** folder mein `license.key`.
  - (electron-builder: `extraResources` mein daal dein — neeche note.)
- App khulte hi yeh key parh leta hai; client na dekhega na badal sakega.

## 2. Central control file: `licenses.json` (GitHub repo root)
Structure:
```json
{
  "SHOP-ALI-01": {
    "shop_name": "Ali General Store",
    "locked": false,
    "expiry": "2027-12-31",
    "message": "",
    "update_enabled": true
  }
}
```
- `locked: true`  -> us shop ki app foran LOCK (SYSTEM BLOCKED screen).
- `expiry`        -> is date ke baad app khud lock ho jayegi (renew reminder).
- `message`       -> lock screen par jo likha dikhe (e.g. "Payment pending").
- `update_enabled`-> false karein to us shop ka Update button band.

App har **30 minute** baad yeh file check karta hai (aur startup par), to
change ~30 min mein pohanch jata hai. Foran chahiye to client app restart kare.

## 3. Kisi shop ko peeche se LOCK karna (payment issue)
1. GitHub par `licenses.json` edit karein.
2. Us shop ki key mein `"locked": true` aur `"message": "Payment pending"`.
3. Commit. ~30 min mein (ya restart par) us shop ki app lock ho jayegi.
   Unlock: wapas `"locked": false` karein.

## 4. Update band/chalu karna
- `"update_enabled": false` -> shop ka Update button kaam nahi karega.
- Jab aap nayi EXE dena chahein: `true` karein, phir woh update le sakenge.

## 5. Global kill switch (sab ek saath)
Purani `killswitch.json` abhi bhi kaam karti hai: `{"locked": true}` sab
installs lock kar degi (jinki apni license entry na ho unke liye bhi).

## 6. electron-builder note (license.key ko app ke saath bhejna)
`package.json` ke build section mein (agar per-install file rakhni ho):
```json
"build": {
  "extraResources": [ { "from": "license.key", "to": "license.key" } ]
}
```
Ya install ke baad manually `license.key` ko app ke resources folder mein rakh dein.

---
Aapka Grand-Dashboard baad mein isi `licenses.json` ko edit/update karega
(GitHub API se) taake aapko file khud edit na karni pare.
