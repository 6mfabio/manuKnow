const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { jsPDF } = require("jspdf");

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./manutencao.db");

// Tabela
db.run(`
CREATE TABLE IF NOT EXISTS manutencao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maquina TEXT,
  problema TEXT,
  solucao TEXT,
  responsavel TEXT,
  status TEXT,
  inicio INTEGER,
  fim INTEGER,
  tempo_servico INTEGER
)
`);

app.use(express.static("frontend"));

/* ABRIR OS */
app.post("/manutencao", (req, res) => {
  const { maquina, problema, solucao, responsavel } = req.body;
  const inicio = Date.now();

  db.run(
    `INSERT INTO manutencao (maquina, problema, solucao, responsavel, status, inicio)
     VALUES (?,?,?,?,?,?)`,
    [maquina, problema, solucao, responsavel, "ABERTA", inicio],
    () => res.json({ ok: true })
  );
});

/* LISTAR */
app.get("/manutencao", (req, res) => {
  db.all(`SELECT * FROM manutencao ORDER BY id DESC`, [], (err, rows) => {
    res.json(rows);
  });
});

/* FECHAR OS */
app.post("/manutencao/:id/fechar", (req, res) => {
  const fim = Date.now();

  db.get(
    `SELECT inicio FROM manutencao WHERE id=?`,
    [req.params.id],
    (err, row) => {
      const tempo = Math.round((fim - row.inicio) / 60000);

      db.run(
        `UPDATE manutencao
         SET status='FECHADA', fim=?, tempo_servico=?
         WHERE id=?`,
        [fim, tempo, req.params.id],
        () => res.json({ tempo })
      );
    }
  );
});

/* PDF */
app.get("/manutencao/:id/pdf", (req, res) => {
  db.get(
    `SELECT * FROM manutencao WHERE id=?`,
    [req.params.id],
    (err, os) => {
      const pdf = new jsPDF();

      pdf.setFontSize(16);
      pdf.text("RELATÓRIO DE MANUTENÇÃO", 20, 20);

      pdf.setFontSize(12);
      pdf.text(`Máquina: ${os.maquina}`, 20, 40);
      pdf.text(`Problema: ${os.problema}`, 20, 50);
      pdf.text(`Solução: ${os.solucao}`, 20, 60);
      pdf.text(`Responsável: ${os.responsavel}`, 20, 70);
      pdf.text(`Status: ${os.status}`, 20, 80);
      pdf.text(`Tempo de Serviço: ${os.tempo_servico || "-"} min`, 20, 90);

      const buffer = Buffer.from(pdf.output("arraybuffer"));

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=manutencao.pdf");
      res.send(buffer);
    }
  );
});

app.listen(3001, () => console.log("Servidor rodando na porta 3001"));
