import { Suspense } from "react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminTableShell, AdminTable, AdminEmptyRow, AdminTableLoading } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { TableSearchBar } from "@/components/admin/table-search-bar";
import { LocalizedName } from "@/components/admin/localized-name";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteRowButton } from "@/components/admin/delete-row-button";
import { Can } from "@/components/admin/can";
import { connectDB } from "@/src/lib/mongodb";
import {
  localizedSortField,
  resolveListParams,
  type ListSearchParams,
} from "@/src/lib/api/list-params";
import { ExamCategory } from "@/src/modules/exams/exam-category.model";
import { examCategoryTypeLabel } from "@/src/modules/exams/category-types";
import Link from "next/link";
import { Pencil } from "lucide-react";

const COLUMNS = ["Name", "Type", "Status"];

export default async function ExamCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div>
      <AdminTabs
        active="/admin/exams/categories"
        tabs={[
          { href: "/admin/exams", label: "Exams" },
          { href: "/admin/exams/categories", label: "Categories" },
        ]}
      />
      <div className="mt-6">
        <AdminTableShell
          title="Exam Categories"
          description="TNPSC, SSC, Banking and other top-level exam categories."
          newHref="/admin/exams/categories/new"
          resource="exams"
          newLabel="New Category"
          toolbar={<TableSearchBar placeholder="Search categories…" />}
        >
          <Suspense key={JSON.stringify(resolvedSearchParams)} fallback={<AdminTableLoading columns={COLUMNS} />}>
            <CategoriesTable searchParams={resolvedSearchParams} />
          </Suspense>
        </AdminTableShell>
      </div>
    </div>
  );
}

async function CategoriesTable({ searchParams }: { searchParams: ListSearchParams }) {
  const { q, page, limit, skip, lang } = resolveListParams(searchParams);
  await connectDB();

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { nameTa: { $regex: q, $options: "i" } },
          { slug: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [categories, total] = await Promise.all([
    ExamCategory.aggregate([
      { $match: filter },
      { $addFields: { sortName: localizedSortField(lang, "name", "nameTa") } },
      { $sort: { sortOrder: 1, sortName: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    ExamCategory.countDocuments(filter),
  ]);

  return (
    <>
      <AdminTable columns={COLUMNS} startIndex={skip}>
        {categories.length === 0 ? (
          <AdminEmptyRow colSpan={4} label="No exam categories yet." />
        ) : (
          categories.map((c) => (
            <tr key={String(c._id)}>
              <td className="px-4 py-3 font-medium">
                <LocalizedName lang={lang} en={c.name} ta={c.nameTa} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {examCategoryTypeLabel(c.type)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <Can resource="exams" action="update">
                    <Link
                      href={`/admin/exams/categories/${c._id}`}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Can>
                  <Can resource="exams" action="delete">
                    <DeleteRowButton resource="exam-categories" id={String(c._id)} />
                  </Can>
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
      <AdminPagination page={page} limit={limit} total={total} searchParams={searchParams} />
    </>
  );
}
