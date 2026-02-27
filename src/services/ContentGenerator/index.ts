/**
 * ContentGenerator Service
 * Stub implementation for learning path content generation
 */

export const generateAllContent = async (
       skeleton: any,
       options?: { concurrency?: number }
): Promise<any> => {

       // stub: content generation not implemented yet
        return {
               lessonsProcessed: skeleton?.lessons?.length ?? 0,
               chaptersProcessed: 0,
               status: 'stub',
        }
}

export default {
       generateAllContent,
}
