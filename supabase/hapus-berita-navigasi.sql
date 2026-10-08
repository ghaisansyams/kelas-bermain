-- Menu Berita dihapus dari website.
-- Kelas Bermain bukan media, jadi halaman artikel tidak dipakai.
-- Aman dijalankan berulang.

delete from navigation_items where href = '/berita';

-- Artikel yang mungkin sempat tersimpan di CMS ikut dibersihkan.
delete from cms_collections where collection_key = 'news';
