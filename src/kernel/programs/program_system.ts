import * as fs from "node:fs";
import { useSistemaDeArquivos } from "../disk/file_system.js";

interface Processo {
  pid: number;
  nome: string;
  timers: any[];
}

export function useProgramas(onOutput: (msg: string) => void) {
  const sistema = useSistemaDeArquivos();
  let pidCounter = 1;
  const tabelaProcessos: Processo[] = [];

  function instalarPrograma(caminhoReal: string, nomeSO: string): boolean {
    if (!fs.existsSync(caminhoReal)) {
      onOutput(`Erro: Arquivo local '${caminhoReal}' não existe.`);
      return false;
    }
    const codigo = fs.readFileSync(caminhoReal, "utf-8");
    return sistema.criarArquivo(nomeSO, codigo);
  }

  function executarPrograma(nomeSO: string, args: string[] = []): void {
    const codigoFonte = sistema.lerConteudoArquivo(nomeSO);

    if (!codigoFonte) {
      onOutput(`Erro: Programa '${nomeSO}' não encontrado.`);
      return;
    }

    const pid = pidCounter++;

    const processo: Processo = {
      pid,
      nome: nomeSO,
      timers: [],
    };
    tabelaProcessos.push(processo);

    const consoleFalso = {
      log: (...msg: any[]) => {
        onOutput(`[PID ${pid}]: ${msg.join(" ")}`);
      },
    };

    const setIntervalFalso = (func: Function, time: number) => {
      const timerId = setInterval(func as any, time);
      processo.timers.push(timerId);
      return timerId;
    };

    try {
      onOutput(`>>> Executando ${nomeSO} (PID ${pid})...`);

      const executavel = new Function(
        "args",
        "sistema",
        "console",
        "setInterval",
        codigoFonte,
      );

      executavel(args, sistema, consoleFalso, setIntervalFalso);
    } catch (e) {
      console.error(`Erro de execução (PID ${pid}):`, e);
    }
  }

  function matarProcesso(pidAlvo: number) {
    const index = tabelaProcessos.findIndex((p) => p.pid === pidAlvo);
    if (index !== -1) {
      const p = tabelaProcessos[index];
      p.timers.forEach((t) => clearInterval(t));
      tabelaProcessos.splice(index, 1);
      onOutput(`Processo ${p.nome} (PID ${pidAlvo}) encerrado.`);
    } else {
      onOutput("PID não encontrado.");
    }
  }

  function listarProgramasInstalados() {
    return sistema.listarArquivos().filter((arq) => arq.nome.endsWith(".js"));
  }

  return {
    instalarPrograma,
    executarPrograma,
    matarProcesso,
    listarProgramasInstalados,
  };
}
