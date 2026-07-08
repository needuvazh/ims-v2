import { redirect } from 'next/navigation';

export default async function RecommendPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/exam-completion/completions/${id}`);
}
