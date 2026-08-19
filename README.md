# Wizardakharh6

> Auto-deployed via **AI → GitHub Sync**.

## Getting Started

```bash
git clone https://github.com/<owner>/Wizardakharh6.git
cd Wizardakharh6
```

## داشبورد مدیریت (Admin Dashboard)

ویزارد حالا یک دیتابیس D1 مخصوص خودش دارد که هر دیپلوی موفق (یا ناموفق) را لاگ می‌کند —
جدا از D1 هر پنلی که کاربران با ویزارد می‌سازند. برای فعال‌سازی، یک‌بار قبل از اولین دیپلوی:

```bash
# 1) ساخت دیتابیس ادمین
npx wrangler d1 create wizard-admin-db
# خروجی این دستور یک database_id می‌دهد؛ آن را در wrangler.toml
# جای REPLACE_WITH_D1_DATABASE_ID بگذارید.

# 2) ساخت کلید ادمین (هر رشتهٔ دلخواه و قوی)
npx wrangler secret put ADMIN_KEY
```

بعد از دیپلوی، به آدرس `https://<دامنهٔ-ویزارد>/#admin` بروید، کلید ادمین را وارد کنید و
لیست همهٔ دیپلوی‌ها (حساب، نام ورکر، روش، دامنه، کشور، زمان) را با جست‌وجو، صفحه‌بندی و
امکان حذف مشاهده کنید. این داشبورد فقط مال خود ویزارد است و به هیچ توکن یا داده‌ای از
پنل‌های دیپلوی‌شدهٔ کاربران دسترسی ندارد.

## License

MIT
