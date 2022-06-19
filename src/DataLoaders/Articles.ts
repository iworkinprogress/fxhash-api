import DataLoader from "dataloader"
import { In } from "typeorm"
import { Article } from "../Entity/Article"
import { ArticleGenerativeToken } from "../Entity/ArticleGenerativeToken"
import { ArticleLedger } from "../Entity/ArticleLedger"
import { ArticleRevision } from "../Entity/ArticleRevision"
import { Split } from "../Entity/Split"


/**
 * Given a list of article IDs, resolves with an array of Articles matching
 */
 const batchArticles = async (userIds) => {
	const users = await Article.find({
		where: {
			id: In(userIds)
		},
	})
	return userIds.map(id => users.find(user => user.id === id))
}
export const createArticlesLoader = () => new DataLoader(batchArticles)

/**
 * Given a list of article IDs, outputs their list of ledgers.
 */
const batchArticlesLedgers = async (ids): Promise<ArticleLedger[][]> => {
  const ledgers = await ArticleLedger.find({
    where: {
      articleId: In(ids)
    }
  })
  return ids.map(
    id => ledgers.filter(
      ledger => ledger.articleId === id
    )
  )
}
export const createArticlesLedgersLoader = () => new DataLoader(
	batchArticlesLedgers
)

/**
 * Given a list of article IDs, outputs a list of list of revisions for the
 * articles.
 */
const batchArticlesRevisions = async (ids): Promise<ArticleRevision[][]> => {
  const revisions = await ArticleRevision.find({
    where: {
      articleId: In(ids)
    }
  })
  return ids.map(
    id => revisions.filter(
      rev => rev.articleId === id
    )
  )
}
export const createArticlesRevisionsLoader = () => new DataLoader(
	batchArticlesRevisions
)

/**
 * Given a list of Article IDs, outputs their splits on the
 * **secondary** market.
 */
 const batchArticlesRoyaltiesSplits = async (ids) => {
	const splits = await Split.createQueryBuilder("split")
		.select()
		.where("split.articleId IN(:...ids)", { ids })
		.getMany()
	return ids.map(id => 
		splits.filter(split => split.articleId === id)
	)
}
export const createArticlesRoyaltiesSplitsLoader = () => new DataLoader(
	batchArticlesRoyaltiesSplits
)

/**
 * Given a list of Article IDs, outputs a list of the ArticleGenerative token
 * instances related to the article (the mentions of a Generative Token in an
 * article)
 */
const batchArticlesGenTokMentions = async (ids) => {
  const mentions = await ArticleGenerativeToken.find({
    where: {
      articleId: In(ids)
    }
  })
  return ids.map(id => 
		mentions.filter(mention => mention.articleId === id)
	)
}
export const createArticlesGenTokMentionsLoader = () => new DataLoader(
	batchArticlesGenTokMentions
)