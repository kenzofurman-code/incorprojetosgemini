/**
 * Template de Demonstração do Cronograma Executivo de Obra (4D)
 * Estrutura sequencial realista de um edifício vertical residencial/comercial.
 */

import type { CronogramaObra4D } from '../types/bim4d'

export const CRONOGRAMA_OBRA_4D_DEFAULT: CronogramaObra4D = {
  id: 'crono-4d-demo-01',
  nome: 'Cronograma Executivo - Edifício Piemonte P74',
  versao: 1,
  dataCriacao: '2026-08-01',
  dataAtualizacao: '2026-08-22',
  atividades: [
    {
      id: 'act-01',
      eap: '1.1',
      nome: 'Serviços Preliminares e Canteiro de Obras',
      dataInicio: '2026-06-01',
      dataFim: '2026-06-20',
      pavimentoAlvo: 'Térreo',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-02',
      eap: '1.2',
      nome: 'Fundações Profundas e Blocos de Coroamento',
      dataInicio: '2026-06-21',
      dataFim: '2026-07-20',
      pavimentoAlvo: 'Fundação',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-03',
      eap: '2.1',
      nome: 'Estrutura - Pilares e Muros do Subsolo',
      dataInicio: '2026-07-21',
      dataFim: '2026-08-15',
      pavimentoAlvo: 'Subsolo',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-04',
      eap: '2.2',
      nome: 'Estrutura - Lajes e Vigas do Térreo',
      dataInicio: '2026-08-16',
      dataFim: '2026-09-05',
      pavimentoAlvo: 'Térreo',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-05',
      eap: '2.3',
      nome: 'Estrutura - Pilares e Vigas 1º Pavimento Tipo',
      dataInicio: '2026-09-06',
      dataFim: '2026-09-30',
      pavimentoAlvo: '1º Pavimento',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-06',
      eap: '2.4',
      nome: 'Estrutura - Laje Maciça do 1º Pavimento',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-20',
      pavimentoAlvo: '1º Pavimento',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-07',
      eap: '2.5',
      nome: 'Estrutura - Pilares e Vigas 2º Pavimento Tipo',
      dataInicio: '2026-10-21',
      dataFim: '2026-11-15',
      pavimentoAlvo: '2º Pavimento',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-08',
      eap: '2.6',
      nome: 'Estrutura - Laje Maciça do 2º Pavimento',
      dataInicio: '2026-11-16',
      dataFim: '2026-12-05',
      pavimentoAlvo: '2º Pavimento',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-09',
      eap: '3.1',
      nome: 'Alvenaria de Vedação e Periférica - 1º Pavimento',
      dataInicio: '2026-12-06',
      dataFim: '2027-01-10',
      pavimentoAlvo: '1º Pavimento',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-10',
      eap: '3.2',
      nome: 'Alvenaria de Vedação - 2º Pavimento',
      dataInicio: '2027-01-11',
      dataFim: '2027-02-15',
      pavimentoAlvo: '2º Pavimento',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-11',
      eap: '4.1',
      nome: 'Instalações Hidráulicas, Elétricas e Ar Condicionado',
      dataInicio: '2027-02-16',
      dataFim: '2027-03-30',
      pavimentoAlvo: 'Todos',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-12',
      eap: '5.1',
      nome: 'Esquadrias, Pele de Vidro e Fachada Ventilada',
      dataInicio: '2027-04-01',
      dataFim: '2027-05-20',
      pavimentoAlvo: 'Fachada',
      bimGuids: [],
      bimExpressIds: [],
    },
    {
      id: 'act-13',
      eap: '6.1',
      nome: 'Acabamentos, Pisos, Pintura e Entrega Final',
      dataInicio: '2027-05-21',
      dataFim: '2027-06-30',
      pavimentoAlvo: 'Todos',
      bimGuids: [],
      bimExpressIds: [],
    },
  ],
}

export const DEFAULT_BIM_4D_ELEMENTS = [
  // Fundação e Subsolo
  { expressId: 101, guid: '2O2$U$point01', category: 'IfcFooting', name: 'Sapata Isolada S-01', storey: 'Fundação', material: 'Concreto C30' },
  { expressId: 102, guid: '2O2$U$point02', category: 'IfcFooting', name: 'Bloco de Coroamento B-01', storey: 'Fundação', material: 'Concreto C30' },
  { expressId: 103, guid: '2O2$U$point03', category: 'IfcColumn', name: 'Pilar Subsolo P-01', storey: 'Subsolo', material: 'Concreto C35' },
  { expressId: 104, guid: '2O2$U$point04', category: 'IfcWall', name: 'Muro de Arrimo MA-01', storey: 'Subsolo', material: 'Concreto C30' },
  
  // Térreo
  { expressId: 201, guid: '3A1$V$point01', category: 'IfcColumn', name: 'Pilar Térreo P-02', storey: 'Térreo', material: 'Concreto C35' },
  { expressId: 202, guid: '3A1$V$point02', category: 'IfcBeam', name: 'Viga Baldrame V-101', storey: 'Térreo', material: 'Concreto C30' },
  { expressId: 203, guid: '3A1$V$point03', category: 'IfcSlab', name: 'Laje Térreo L-01', storey: 'Térreo', material: 'Concreto C25' },

  // 1º Pavimento Tipo
  { expressId: 301, guid: '4B2$W$point01', category: 'IfcColumn', name: 'Pilar P-101', storey: '1º Pavimento', material: 'Concreto C35' },
  { expressId: 302, guid: '4B2$W$point02', category: 'IfcColumn', name: 'Pilar P-102', storey: '1º Pavimento', material: 'Concreto C35' },
  { expressId: 303, guid: '4B2$W$point03', category: 'IfcBeam', name: 'Viga V-201', storey: '1º Pavimento', material: 'Concreto C30' },
  { expressId: 304, guid: '4B2$W$point04', category: 'IfcBeam', name: 'Viga V-202', storey: '1º Pavimento', material: 'Concreto C30' },
  { expressId: 305, guid: '4B2$W$point05', category: 'IfcSlab', name: 'Laje Maciça L-101', storey: '1º Pavimento', material: 'Concreto C25' },
  { expressId: 306, guid: '4B2$W$point06', category: 'IfcWall', name: 'Alvenaria Bloco Cerâmico', storey: '1º Pavimento', material: 'Alvenaria 14x19x29' },

  // 2º Pavimento Tipo
  { expressId: 401, guid: '5C3$X$point01', category: 'IfcColumn', name: 'Pilar P-201', storey: '2º Pavimento', material: 'Concreto C35' },
  { expressId: 402, guid: '5C3$X$point02', category: 'IfcColumn', name: 'Pilar P-202', storey: '2º Pavimento', material: 'Concreto C35' },
  { expressId: 403, guid: '5C3$X$point03', category: 'IfcBeam', name: 'Viga V-301', storey: '2º Pavimento', material: 'Concreto C30' },
  { expressId: 404, guid: '5C3$X$point04', category: 'IfcSlab', name: 'Laje Maciça L-201', storey: '2º Pavimento', material: 'Concreto C25' },
  { expressId: 405, guid: '5C3$X$point05', category: 'IfcWall', name: 'Alvenaria Interna 2º Pav', storey: '2º Pavimento', material: 'Alvenaria 14x19x29' },

  // Fachada e Cobertura
  { expressId: 501, guid: '6D4$Y$point01', category: 'IfcWindow', name: 'Esquadria de Alumínio E-01', storey: 'Fachada', material: 'Vidro Laminado / Alumínio' },
  { expressId: 502, guid: '6D4$Y$point02', category: 'IfcDoor', name: 'Porta de Entrada Balcão', storey: 'Fachada', material: 'Vidro / Alumínio' },
]

