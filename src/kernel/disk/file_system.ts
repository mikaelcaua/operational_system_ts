import * as fs from "node:fs";
import * as path from "node:path";

const CAMINHO_DO_DISCO = "../../hardware/disk.txt";
const TAMANHO_DISCO = 20 * 1024 * 1024;
const TAMANHO_CLUSTER = 4096;
const QTD_ENTRADAS_FAT = TAMANHO_DISCO / TAMANHO_CLUSTER;
const TAMANHO_ENTRADA_FAT = 4;
const TAMANHO_FAT_BYTES = QTD_ENTRADAS_FAT * TAMANHO_ENTRADA_FAT;

const MAXIMO_ARQUIVOS = 128;
const TAMANHO_REGISTRO_ARQUIVO = 64;
const TAMANHO_DIRETORIO_BYTES = MAXIMO_ARQUIVOS * TAMANHO_REGISTRO_ARQUIVO;

const POSICAO_DIRETORIO = TAMANHO_FAT_BYTES;
const POSICAO_DADOS =
  Math.ceil((TAMANHO_FAT_BYTES + TAMANHO_DIRETORIO_BYTES) / TAMANHO_CLUSTER) *
  TAMANHO_CLUSTER;

const FIM_DE_ARQUIVO = 0xffffffff;
const CLUSTER_LIVRE = 0;

export interface DetalhesArquivo {
  nome: string;
  tamanho: number;
  clusterInicial: number;
}

export function useSistemaDeArquivos() {
  const tabelaFAT = new Uint32Array(QTD_ENTRADAS_FAT);

  function abrirDisco(modoLeitura: string): number {
    const pastaDoDisco = path.dirname(CAMINHO_DO_DISCO);
    if (!fs.existsSync(pastaDoDisco)) {
      fs.mkdirSync(pastaDoDisco, { recursive: true });
    }

    if (!fs.existsSync(CAMINHO_DO_DISCO)) {
      const descritor = fs.openSync(CAMINHO_DO_DISCO, "w");
      const discoVazio = Buffer.alloc(TAMANHO_DISCO);
      fs.writeSync(descritor, discoVazio);
      fs.closeSync(descritor);
    }
    return fs.openSync(CAMINHO_DO_DISCO, modoLeitura);
  }

  function carregarTabelaFAT() {
    const descritor = abrirDisco("r");
    const buffer = Buffer.alloc(TAMANHO_FAT_BYTES);
    fs.readSync(descritor, buffer, 0, TAMANHO_FAT_BYTES, 0);
    for (let i = 0; i < QTD_ENTRADAS_FAT; i++) {
      tabelaFAT[i] = buffer.readUInt32LE(i * 4);
    }
    fs.closeSync(descritor);
  }

  function salvarTabelaFAT() {
    const descritor = abrirDisco("r+");
    const buffer = Buffer.alloc(TAMANHO_FAT_BYTES);
    for (let i = 0; i < QTD_ENTRADAS_FAT; i++) {
      buffer.writeUInt32LE(tabelaFAT[i], i * 4);
    }
    fs.writeSync(descritor, buffer, 0, TAMANHO_FAT_BYTES, 0);
    fs.closeSync(descritor);
  }

  function iniciar() {
    carregarTabelaFAT();
  }

  function listarArquivos(): DetalhesArquivo[] {
    const descritor = abrirDisco("r");
    const lista: DetalhesArquivo[] = [];
    const buffer = Buffer.alloc(TAMANHO_REGISTRO_ARQUIVO);

    for (let i = 0; i < MAXIMO_ARQUIVOS; i++) {
      fs.readSync(
        descritor,
        buffer,
        0,
        TAMANHO_REGISTRO_ARQUIVO,
        POSICAO_DIRETORIO + i * TAMANHO_REGISTRO_ARQUIVO,
      );

      if (buffer[0] !== 0) {
        const nome = buffer.toString("utf-8", 0, 32).replace(/\0/g, "");
        const clusterInicial = buffer.readUInt32LE(32);
        const tamanho = buffer.readUInt32LE(36);
        lista.push({ nome, tamanho, clusterInicial });
      }
    }
    fs.closeSync(descritor);
    return lista;
  }

  function lerConteudoArquivo(nomeArquivo: string): string | null {
    const arquivos = listarArquivos();
    const arquivoEncontrado = arquivos.find((arq) => arq.nome === nomeArquivo);

    if (!arquivoEncontrado) return null;

    const descritor = abrirDisco("r");
    const bufferConteudo = Buffer.alloc(arquivoEncontrado.tamanho);

    let clusterAtual = arquivoEncontrado.clusterInicial;
    let bytesLidos = 0;

    while (
      clusterAtual !== FIM_DE_ARQUIVO &&
      bytesLidos < arquivoEncontrado.tamanho
    ) {
      const posicaoFisica = POSICAO_DADOS + clusterAtual * TAMANHO_CLUSTER;
      const quantoLer = Math.min(
        TAMANHO_CLUSTER,
        arquivoEncontrado.tamanho - bytesLidos,
      );

      fs.readSync(
        descritor,
        bufferConteudo,
        bytesLidos,
        quantoLer,
        posicaoFisica,
      );

      bytesLidos += quantoLer;
      clusterAtual = tabelaFAT[clusterAtual];
    }
    fs.closeSync(descritor);
    return bufferConteudo.toString("utf-8");
  }

  function criarArquivo(nome: string, conteudo: string): boolean {
    const dados = Buffer.from(conteudo);
    const clustersNecessarios = Math.ceil(dados.length / TAMANHO_CLUSTER);

    const clustersLivres: number[] = [];
    for (let i = 2; i < QTD_ENTRADAS_FAT; i++) {
      if (tabelaFAT[i] === CLUSTER_LIVRE) {
        clustersLivres.push(i);
        if (clustersLivres.length === clustersNecessarios) break;
      }
    }

    if (clustersLivres.length < clustersNecessarios) return false;

    const descritor = abrirDisco("r+");
    let indiceDiretorio = -1;
    const bufferDiretorio = Buffer.alloc(TAMANHO_REGISTRO_ARQUIVO);

    for (let i = 0; i < MAXIMO_ARQUIVOS; i++) {
      fs.readSync(
        descritor,
        bufferDiretorio,
        0,
        TAMANHO_REGISTRO_ARQUIVO,
        POSICAO_DIRETORIO + i * TAMANHO_REGISTRO_ARQUIVO,
      );
      if (bufferDiretorio[0] === 0) {
        indiceDiretorio = i;
        break;
      }
    }

    if (indiceDiretorio === -1) {
      fs.closeSync(descritor);
      return false;
    }

    for (let i = 0; i < clustersLivres.length; i++) {
      const clusterAtual = clustersLivres[i];
      const proximoCluster =
        i === clustersLivres.length - 1
          ? FIM_DE_ARQUIVO
          : clustersLivres[i + 1];

      tabelaFAT[clusterAtual] = proximoCluster;

      const inicioRecorte = i * TAMANHO_CLUSTER;
      const fimRecorte = Math.min(
        inicioRecorte + TAMANHO_CLUSTER,
        dados.length,
      );
      const pedacoDados = dados.subarray(inicioRecorte, fimRecorte);

      fs.writeSync(
        descritor,
        pedacoDados,
        0,
        pedacoDados.length,
        POSICAO_DADOS + clusterAtual * TAMANHO_CLUSTER,
      );
    }

    const novoRegistro = Buffer.alloc(TAMANHO_REGISTRO_ARQUIVO);
    novoRegistro.write(nome, 0, 32, "utf-8");
    novoRegistro.writeUInt32LE(clustersLivres[0], 32);
    novoRegistro.writeUInt32LE(dados.length, 36);

    fs.writeSync(
      descritor,
      novoRegistro,
      0,
      TAMANHO_REGISTRO_ARQUIVO,
      POSICAO_DIRETORIO + indiceDiretorio * TAMANHO_REGISTRO_ARQUIVO,
    );

    fs.closeSync(descritor);
    salvarTabelaFAT();
    return true;
  }

  function apagarArquivo(nome: string): boolean {
    const descritor = abrirDisco("r+");
    const bufferDiretorio = Buffer.alloc(TAMANHO_REGISTRO_ARQUIVO);
    let encontrou = false;

    for (let i = 0; i < MAXIMO_ARQUIVOS; i++) {
      const posicaoAtual = POSICAO_DIRETORIO + i * TAMANHO_REGISTRO_ARQUIVO;
      fs.readSync(
        descritor,
        bufferDiretorio,
        0,
        TAMANHO_REGISTRO_ARQUIVO,
        posicaoAtual,
      );
      const nomeLido = bufferDiretorio
        .toString("utf-8", 0, 32)
        .replace(/\0/g, "");

      if (nomeLido === nome) {
        const primeiroCluster = bufferDiretorio.readUInt32LE(32);

        const registroVazio = Buffer.alloc(TAMANHO_REGISTRO_ARQUIVO);
        fs.writeSync(
          descritor,
          registroVazio,
          0,
          TAMANHO_REGISTRO_ARQUIVO,
          posicaoAtual,
        );

        let clusterAtual = primeiroCluster;
        while (clusterAtual !== FIM_DE_ARQUIVO && clusterAtual !== 0) {
          const proximo = tabelaFAT[clusterAtual];
          tabelaFAT[clusterAtual] = CLUSTER_LIVRE;
          clusterAtual = proximo;
        }

        encontrou = true;
        break;
      }
    }

    fs.closeSync(descritor);
    if (encontrou) salvarTabelaFAT();
    return encontrou;
  }

  function formatarDisco() {
    if (fs.existsSync(CAMINHO_DO_DISCO)) fs.unlinkSync(CAMINHO_DO_DISCO);
    iniciar();
  }

  return {
    iniciar,
    listarArquivos,
    lerConteudoArquivo,
    criarArquivo,
    apagarArquivo,
    formatarDisco,
  };
}
