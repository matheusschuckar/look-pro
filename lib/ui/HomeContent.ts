// lib/ui/homeContent.ts

export const HOME_CAROUSEL = [
    {
      title: "Moda em minutos",
      subtitle: [
        "O primeiro delivery de moda do mundo",
        "com curadoria de excelência e entrega rápida",
      ],
      image:
        "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Brunello-Cucinelli-Portofino-Summer-2023-Couples-Outfits.jpg",
      href: "/collections/sobre",
    },
  ] as const;
  
  export const INLINE_BANNERS = {
    editorialTall: {
      href: "/collections/editorial",
      image:
        "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/NEW%20IN%20LOUIS%20VUITTON-3.png",
      alt: "Editorial da marca",
    },
    selectionHero: {
      href: "/collections/fasano",
      image:
        "https://kuaoqzxqraeioqyhmnkw.supabase.co/storage/v1/object/public/product-images/Untitled%20(448%20x%20448%20px)-4.png",
      alt: "selecao fasano",
    },
    landscapeTriplet: [
      {
        href: "/collections/nova-colecao",
        image: "https://via.placeholder.com/800x200?text=Banner+1",
        alt: "Nova coleção",
      },
      {
        href: "/collections/occasions",
        image: "https://via.placeholder.com/800x200?text=Banner+2",
        alt: "Ocasiões",
      },
      {
        href: "/collections/essentials",
        image: "https://via.placeholder.com/800x200?text=Banner+3",
        alt: "Essenciais",
      },
    ],
  } as const;
  
