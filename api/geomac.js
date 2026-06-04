import { neon } from '@neondatabase/serverless';

let isInitialized = false;

async function initDB(sql) {
    if (isInitialized) return;
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS puntos_gps (
                id VARCHAR(255) PRIMARY KEY,
                lat FLOAT NOT NULL,
                lng FLOAT NOT NULL,
                alt FLOAT NOT NULL,
                name VARCHAR(255) NOT NULL
            );
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS macs (
                mac VARCHAR(255) PRIMARY KEY
            );
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS associations (
                id SERIAL PRIMARY KEY,
                mac VARCHAR(255) REFERENCES macs(mac) ON DELETE CASCADE,
                punto_id VARCHAR(255) REFERENCES puntos_gps(id) ON DELETE CASCADE,
                UNIQUE(mac, punto_id)
            );
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS config (
                key VARCHAR(255) PRIMARY KEY,
                value FLOAT NOT NULL
            );
        `;
        
        await sql`
            INSERT INTO config (key, value)
            VALUES ('radiusDistance', 15)
            ON CONFLICT (key) DO NOTHING;
        `;
        
        isInitialized = true;
    } catch (e) {
        console.error('Error initializing database', e);
        throw e;
    }
}

export default async function handler(req, res) {
    try {
        // En Vercel configuramos la variable de entorno DATABASE_URL proporcionada por Neon
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada en las variables de entorno.');
        }

        const sql = neon(process.env.DATABASE_URL);
        await initDB(sql);

        if (req.method === 'GET') {
            const puntosGPS = await sql`SELECT id, lat, lng, alt, name FROM puntos_gps`;
            const macsRows = await sql`SELECT mac FROM macs`;
            const assocRows = await sql`SELECT mac, punto_id as "puntoId" FROM associations`;
            const configRows = await sql`SELECT value FROM config WHERE key = 'radiusDistance'`;

            const radiusDistance = configRows.length > 0 ? configRows[0].value : 15;
            const macs = macsRows.map(row => row.mac);

            return res.status(200).json({
                puntosGPS,
                macs,
                associations: assocRows,
                radiusDistance
            });
        }

        if (req.method === 'POST') {
            const body = req.body;
            if (!body || !body.action) {
                return res.status(400).json({ error: 'Falta la propiedad action en el body' });
            }

            switch (body.action) {
                case 'addPunto': {
                    const { id, lat, lng, alt, name } = body.data;
                    await sql`
                        INSERT INTO puntos_gps (id, lat, lng, alt, name)
                        VALUES (${id}, ${lat}, ${lng}, ${alt}, ${name})
                    `;
                    return res.status(200).json({ success: true });
                }

                case 'renamePunto':
                    await sql`
                        UPDATE puntos_gps
                        SET name = ${body.name}
                        WHERE id = ${body.id}
                    `;
                    return res.status(200).json({ success: true });

                case 'addMacAssociation':
                    await sql`
                        INSERT INTO macs (mac)
                        VALUES (${body.mac})
                        ON CONFLICT (mac) DO NOTHING
                    `;
                    await sql`
                        INSERT INTO associations (mac, punto_id)
                        VALUES (${body.mac}, ${body.puntoId})
                        ON CONFLICT (mac, punto_id) DO NOTHING
                    `;
                    return res.status(200).json({ success: true });
                
                case 'setRadius':
                    await sql`
                        UPDATE config
                        SET value = ${body.radiusDistance}
                        WHERE key = 'radiusDistance'
                    `;
                    return res.status(200).json({ success: true });

                default:
                    return res.status(400).json({ error: 'Acción desconocida' });
            }
        }

        if (req.method === 'DELETE') {
            const body = req.body;
            if (!body || !body.action) {
                return res.status(400).json({ error: 'Falta la propiedad action en el body' });
            }

            switch (body.action) {
                case 'removePunto':
                    await sql`
                        DELETE FROM puntos_gps
                        WHERE id = ${body.id}
                    `;
                    return res.status(200).json({ success: true });

                case 'removeMacAssociation':
                    await sql`
                        DELETE FROM associations
                        WHERE mac = ${body.mac} AND punto_id = ${body.puntoId}
                    `;
                    return res.status(200).json({ success: true });

                default:
                    return res.status(400).json({ error: 'Acción desconocida' });
            }
        }

        return res.status(405).json({ error: 'Método no permitido' });
    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
