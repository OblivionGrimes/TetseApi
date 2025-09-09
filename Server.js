import express from "express";
import mysql from "mysql2/promise";

const app = express();
app.use(express.json());

let db;

async function initDB() {
  db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "3233",
    database: "testeapi"
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS paises_curtidas (
      id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      pais VARCHAR(100) UNIQUE,
      curtidas INT DEFAULT 0,
      n_curtidas INT DEFAULT 0
    )
  `);

  console.log("Conectado ao BD");
}

initDB();

app.get("/paises/top10", async (req, res) => {
  try {
    const response = await fetch("https://restcountries.com/v3.1/all?fields=name,population,region");
    const data = await response.json();

    const paises = data.map(p => ({
      nome: p.name.common,
      populacao: p.population,
      continente: p.region
    }));

    const top10 = paises.sort((a, b) => b.populacao - a.populacao).slice(0, 10);

    res.json(top10);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar países: " + err.message });
  }
});


app.get("/paises/buscar", async (req, res) => {
  const { nome } = req.query;

  try {
    const response = await fetch(`https://restcountries.com/v3.1/name/${nome}`);
    
    const data = await response.json();

    const pais = {
      nome: data[0].name.common,
      populacao: data[0].population,
      continente: data[0].region
    };

    const [rows] = await db.query("SELECT * FROM paises_curtidas WHERE LOWER(paises) like ?", [pais.nome]);
    pais.avaliacao = rows[0] || { votos_curti: 0, votos_nao_curti: 0 };

    res.json(pais);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// adição nova para novos teste
app.get("/paises/regiao", async(req, res) => {
  try{
    const { nome } = req.query;

    const response = await fetch(`https://restcountries.com/v3.1/region/${nome}`);

    const dados = await response.json();

    const paises = dados.map( p => ({
      nome: p.name.common,
      populacao: p.population,
      continente: p.region
    }));

    const top10 = paises.sort((a, b) => b.populacao - a.populacao).slice(0, 10);

    res.json(top10);
  }catch (err){
    res.status(500).json({erro: err.message});
  }

})

app.post("/paises/avaliar", async (req, res) => {
  const { pais, voto } = req.body;
    try {
        const [valida] = await db.query("SELECT 1 FROM paises_curtidas WHERE paises = ?", [pais]);

        if(valida[0] == null){
            await db.query(
            `INSERT INTO paises_curtidas (paises, curtidas, n_curtidas) 
            VALUES (?, ?, ?) `,
            [pais, voto == "curti" ? 1 : 0, voto == "nao_curti" ? 1 : 0, pais]
        );
        }else{
            await db.query(
            `UPDATE paises_curtidas 
            SET curtidas = curtidas + ?, 
                n_curtidas = n_curtidas + ? 
            WHERE paises = ?`,
            [voto == "curti" ? 1 : 0, voto == "nao_curti" ? 1 : 0, pais]
            );
        }
        const [updated] = await db.query("SELECT curtidas, n_curtidas FROM paises_curtidas WHERE paises = ?", [pais]);

        res.json({ sucesso: true, pais, avaliacao: updated[0] });

    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

try{
    app.get("/paises/avaliar", async (req, res) => {

        const [rows] = await db.query("SELECT * FROM paises_curtidas");
        res.json(rows);
    
    });
} catch (err) {
    res.status(500).json({ erro: err.message });
}

app.listen(3000, () => console.log("http://localhost:3000"));
