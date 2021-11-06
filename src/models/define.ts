export class TOCItem {
    type: string;
    namespace?: string;
    title?:string;
    slug?:string;
    id?: number;
    url?: string;
    uuid?: string;
    child_uuid?: string;
    parent_uuid?: string;
}

export class DocumentId {
    public id: number;
    public slug: string;
    public title: string;

    constructor(id?:number, slug?:string, title?:string) {
        this.id = id;
        this.slug = slug;
        this.title = title;
    }
}