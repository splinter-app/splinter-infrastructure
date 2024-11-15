import { _id, _times } from './_mock';

export const _timeline = [...Array(8)].map((_, index) => ({
  id: _id(index),
  title: [
    'Ingest process finished in 88.513533834s',
    'Embed finished in 78.90810813s',
    'Calling EmbedStep with 1 docs',
    'Chunk step finished in 0.101532066s',
    'Calling ChunkStep with 1 docs',
    'Partition step finished in 5.674409688s',
    'Calling PartitionStep with 1 docs',
    'Running local pipeline',
  ][index],
  type: `type${index + 1}`,
  time: _times(index),
}));
