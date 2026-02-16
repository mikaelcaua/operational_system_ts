import * as fs from "node:fs";
import { useSistemaDeArquivos } from "../disk/file_system.js";

interface Processo {
  pid: number;
  nome: string;
  timers: any[];
  inicio: number;
}

export function useSistemaDeProgramas(onOutput: (msg: string) => void) {
  const sistemaDeArquivos = useSistemaDeArquivos();
  let contadorPID = 1;
  const tabelaProcessos: Processo[] = [];

  function instalarPrograma(
    caminhoReal: string,
    nomeNoSistema: string,
  ): boolean {
    if (!fs.existsSync(caminhoReal)) {
      onOutput(`Erro: Arquivo local '${caminhoReal}' não existe.`);
      return false;
    }
    const codigo = fs.readFileSync(caminhoReal, "utf-8");
    return sistemaDeArquivos.criarArquivo(nomeNoSistema, codigo);
  }

  function executarPrograma(
    nomeNoSistema: string,
    argumentos: string[] = [],
  ): void {
    const codigoFonte = sistemaDeArquivos.lerConteudoArquivo(nomeNoSistema);

    if (!codigoFonte) {
      onOutput(`Erro: Programa '${nomeNoSistema}' não encontrado.`);
      return;
    }

    const pid = contadorPID++;
    const novoProcesso: Processo = {
      pid,
      nome: nomeNoSistema,
      timers: [],
      inicio: Date.now(),
    };
    tabelaProcessos.push(novoProcesso);

    const consoleFalso = {
      log: (...msg: any[]) => onOutput(`[PID ${pid}]: ${msg.join(" ")}`),
    };

    const setIntervalFalso = (funcao: Function, tempo: number) => {
      const idTimer = setInterval(() => {
        funcao();
      }, tempo);
      novoProcesso.timers.push(idTimer);
      return idTimer;
    };

    try {
      const tempoAntes = Date.now();

      const carregarExecutavel = new Function(
        "args",
        "sistema",
        "console",
        "setInterval",
        codigoFonte,
      );

      carregarExecutavel(
        argumentos,
        sistemaDeArquivos,
        consoleFalso,
        setIntervalFalso,
      );

      const duracao = Date.now() - tempoAntes;
      if (duracao > 1000) {
        onOutput(
          `[SISTEMA]: Aviso - PID ${pid} ocupou a CPU por ${duracao}ms.`,
        );
      }
    } catch (e: any) {
      onOutput(`Erro de execução (PID ${pid}): ${e.message}`);
    }
  }

  function matarProcesso(pidAlvo: number) {
    const indice = tabelaProcessos.findIndex((p) => p.pid === pidAlvo);
    if (indice !== -1) {
      const processo = tabelaProcessos[indice];
      processo.timers.forEach((t) => clearInterval(t));
      tabelaProcessos.splice(indice, 1);
      onOutput(`Processo ${processo.nome} (PID ${pidAlvo}) encerrado.`);
    } else {
      onOutput("PID não encontrado.");
    }
  }

  function listarProcessos() {
    return tabelaProcessos.map((p) => ({
      PID: p.pid,
      Nome: p.nome,
      Timers: p.timers.length,
      Uptime: `${Math.floor((Date.now() - p.inicio) / 1000)}s`,
    }));
  }

  return { instalarPrograma, executarPrograma, matarProcesso, listarProcessos };
}
