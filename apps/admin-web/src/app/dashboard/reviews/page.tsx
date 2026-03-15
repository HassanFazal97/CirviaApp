'use client';

import { useEffect, useState } from 'react';
import { Review } from '@cirvia/types';
import { apiFetch } from '@/lib/api';

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: Review[]; total: number }>('/admin/reviews?limit=100')
      .then((res) => {
        setReviews(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Reviewer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Target</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Rating</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Comment</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {review.reviewer_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize text-gray-700">{review.target_type}</span>
                </td>
                <td className="px-4 py-3">
                  <StarRating rating={review.rating} />
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {review.comment ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No reviews found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
