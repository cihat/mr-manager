import TypeDocGenerator from '@/components/type-doc-generation';
import PreviewDocs from '@/components/preview-doc';

const Docs = () => {
  return (
    <div className='bg-background flex w-full h-full'>
      <TypeDocGenerator />
      <PreviewDocs />
    </div>
  )
}

export default Docs;
