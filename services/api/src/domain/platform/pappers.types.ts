export type PappersDirigeant = {
  nom?: string;
  prenom?: string;
  prenoms?: string;
};

export type PappersEntrepriseRow = {
  siren?: string | number;
  siret?: string | number;
  nom_entreprise?: string;
  denomination?: string;
  nom?: string;
  code_naf?: string;
  naf?: string;
  libelle_code_naf?: string;
  libelle_naf?: string;
  date_creation?: string;
  ville?: string;
  code_postal?: string;
  domaine?: string;
  site_internet?: string;
  website?: string;
  siege?: {
    siret?: string | number;
    ville?: string;
    code_postal?: string;
  };
  dirigeants?: PappersDirigeant[];
};

export type PappersRechercheResponse = {
  resultats?: PappersEntrepriseRow[];
  entreprises?: PappersEntrepriseRow[];
  total?: number;
  page?: number;
};
