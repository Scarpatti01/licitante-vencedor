import { CarregandoPagina } from "@/components/app/ui";

/**
 * O estado de carregamento da tela de leads.
 *
 * Existe porque a página faz uma consulta de rede antes de ter o que mostrar, e
 * sem isto o navegador fica na tela anterior durante esse tempo — o que se lê
 * como clique que não funcionou, e rende um segundo clique.
 */
export default function Carregando() {
  return <CarregandoPagina titulo="os leads do site" />;
}
