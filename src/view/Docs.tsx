import TypeDocGenerator from '@/components/type-doc-generation';
import PreviewDocs from '@/components/preview-doc';

const Docs = () => {
  return (
    <div className='bg-background w-full grid grid-cols-4  max-h-[calc(100vh-64px)]'>
      <TypeDocGenerator />
      <PreviewDocs />
    </div>
  )
}

export default Docs;
