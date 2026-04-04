export type Course = {
  id: number;
  title: string;
  description: string;
  creationDate: string;
  duration: number;
  authors: Author[];
  tags: Tag[];
};
