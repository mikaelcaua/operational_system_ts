import * as readline from "node:readline";
import { useSistemaDeArquivos } from "../kernel/disk/file_system.js";
import { useProgramas } from "../kernel/programs/program_system.js";

export function useShell() {
  const sistema = useSistemaDeArquivos();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "meu_so> ",
  });

  const handleOutput = (msg: string) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
  };

  const programas = useProgramas(handleOutput);

  function iniciarTerminal() {
    sistema.iniciar();

    console.log("=== S.O. Iniciado (Multi-tasking Visual) ===");
    rl.prompt();

    rl.on("line", (linha) => {
      const args = linha.trim().split(" ");
      const comando = args[0];

      switch (comando) {
        case "install":
          if (args[1] && args[2]) {
            const ok = programas.instalarPrograma(args[1], args[2]);
            if (ok) console.log("Instalado com sucesso.");
          } else console.log("Uso: install <caminho_real> <nome_interno>");
          break;

        case "run":
          if (args[1]) {
            programas.executarPrograma(args[1], args.slice(2));
          } else console.log("Uso: run <programa> [args]");
          break;

        case "kill":
          if (args[1]) {
            programas.matarProcesso(Number(args[1]));
          } else console.log("Uso: kill <pid>");
          break;

        case "ls":
          const arquivos = sistema.listarArquivos();
          console.table(
            arquivos.map((f) => ({ Nome: f.nome, Tamanho: f.tamanho })),
          );
          break;

        case "cat":
          if (args[1]) {
            const content = sistema.lerConteudoArquivo(args[1]);
            console.log(content || "Arquivo vazio ou inexistente.");
          }
          break;

        case "rm":
          if (args[1]) {
            sistema.apagarArquivo(args[1]);
            console.log("Arquivo apagado.");
          }
          break;

        case "exit":
          process.exit(0);
          break;

        default:
          if (comando) console.log("Comando desconhecido.");
      }

      rl.prompt();
    });
  }

  return { iniciarTerminal };
}
