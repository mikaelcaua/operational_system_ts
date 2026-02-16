import * as fs from "node:fs";
import * as path from "node:path";
import { Worker } from "node:worker_threads";
import { useSistemaDeArquivos } from "../disk/file_system.js";

interface Processo {
  pid: number;
  nome: string;
  worker: Worker;
  inicio: number;
}

export function useSistemaDeProgramas(onOutput: (msg: string) => void) {
  const sistemaDeArquivos = useSistemaDeArquivos();
  let contadorPID = 1;
  const tabelaProcessos: Processo[] = [];

  const PASTA_PROGRAMAS_REAIS = path.resolve("programs_to_install");

  function instalarPrograma(
    nomeArquivoReal: string,
    nomeNoSistema: string,
  ): boolean {
    const caminhoCompleto = path.join(PASTA_PROGRAMAS_REAIS, nomeArquivoReal);

    if (!fs.existsSync(caminhoCompleto)) {
      onOutput(
        `Erro: Arquivo '${nomeArquivoReal}' não encontrado em ${PASTA_PROGRAMAS_REAIS}`,
      );
      return false;
    }

    try {
      const codigo = fs.readFileSync(caminhoCompleto, "utf-8");
      return sistemaDeArquivos.criarArquivo(nomeNoSistema, codigo);
    } catch (e: any) {
      onOutput(`Erro ao ler arquivo: ${e.message}`);
      return false;
    }
  }

  function executarPrograma(
    nomeNoSistema: string,
    argumentos: string[] = [],
  ): void {
    const codigoFonte = sistemaDeArquivos.lerConteudoArquivo(nomeNoSistema);

    if (!codigoFonte) {
      onOutput(
        `Erro: Programa '${nomeNoSistema}' não encontrado no disco virtual.`,
      );
      return;
    }

    const pid = contadorPID++;

    const workerCode = `
import { parentPort } from "node:worker_threads";

const args = ${JSON.stringify(argumentos)};
const console = {
  log: (...msg) => parentPort.postMessage({ type: 'log', content: msg.join(' ') }),
  error: (...msg) => parentPort.postMessage({ type: 'error', content: msg.join(' ') })
};

async function rodar() {
  try {
    ${codigoFonte}
  } catch (e) {
    parentPort.postMessage({ type: 'error', content: e.message });
  }
}

rodar();
    `;

    const scriptBase64 = Buffer.from(workerCode).toString("base64");
    const workerURL = new URL(`data:text/javascript;base64,${scriptBase64}`);

    const worker = new Worker(workerURL);

    const novoProcesso: Processo = {
      pid,
      nome: nomeNoSistema,
      worker,
      inicio: Date.now(),
    };

    tabelaProcessos.push(novoProcesso);

    worker.on("message", (msg) => {
      if (msg.type === "log") onOutput(`[PID ${pid}]: ${msg.content}`);
      if (msg.type === "error") onOutput(`[PID ${pid} ERRO]: ${msg.content}`);
    });

    worker.on("error", (err) => {
      onOutput(`[PID ${pid} CRASH]: ${err.message}`);
      matarProcesso(pid);
    });

    worker.on("exit", () => {
      const indice = tabelaProcessos.findIndex((p) => p.pid === pid);
      if (indice !== -1) tabelaProcessos.splice(indice, 1);
    });
  }

  function matarProcesso(pidAlvo: number) {
    const indice = tabelaProcessos.findIndex((p) => p.pid === pidAlvo);
    if (indice !== -1) {
      tabelaProcessos[indice].worker.terminate();
      tabelaProcessos.splice(indice, 1);
      onOutput(`Processo ${pidAlvo} encerrado.`);
    } else {
      onOutput("PID não encontrado.");
    }
  }

  function listarProcessos() {
    return tabelaProcessos.map((p) => ({
      PID: p.pid,
      Nome: p.nome,
      Uptime: `${Math.floor((Date.now() - p.inicio) / 1000)}s`,
    }));
  }

  return {
    instalarPrograma,
    executarPrograma,
    matarProcesso,
    listarProcessos,
  };
}
