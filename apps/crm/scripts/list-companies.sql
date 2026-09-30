SELECT c.id, c.name, COUNT(d.id) AS deals
FROM company c
LEFT JOIN deal d ON d."companyId" = c.id
GROUP BY c.id, c.name
ORDER BY MAX(c."createdAt") DESC
LIMIT 15;
